# omnirepo

`omnirepo` is a TypeScript library for building repositories over your own persistence and cache implementations. It provides a consistent API for reads and writes, coordinates cache reads and updates, and lets applications choose how cache failures affect repository calls.

The library does not connect directly to a database or Redis client. You provide adapters that implement its `Storage<Entity>` and `Cache<Entity>` contracts. This keeps application and vendor specific code outside the repository core.

## Installation

The `dist` branch contains the latest built package. Add it to another project's `package.json`:

```json
{
  "dependencies": {
    "omnirepo": "github:AlexeyAdoniev/omnirepo#dist"
  }
}
```

The published package targets Node.js 20.11 or newer and includes TypeScript declarations.

## Core concepts

### Entity

An entity is the application's record type. It must have an `_id` field, whose value is converted to a string when the library uses it as a cache key. Use the same string representation in storage's `findById`, `updateById`, and `deleteById` methods.

```ts
interface User {
  _id: string;
  name: string;
  email: string;
}
```

Object ID types are also suitable. For example, a Mongo adapter can accept string IDs in the `Storage` interface and convert them to Mongo `ObjectId`s internally.

### `Storage<Entity>`

The storage adapter is the source of truth. Implement these asynchronous methods using your database or other durable store:

| Method | Purpose |
| --- | --- |
| `count(query?)` | Count entities matching the supplied partial entity fields. |
| `findById(id)` | Return one entity or `null`. |
| `find(query, options?)` | Return matching entities, honoring `skip` and `limit`. |
| `insert(entity)` | Persist and return the inserted entity, or `null` if your adapter uses that to signal no result. |
| `updateById(id, updates)` | Update and return the resulting entity, or `null` if no entity matched. |
| `deleteById(id)` | Delete and return the deleted entity, or `null` if none matched. |

`find` should return no more than the requested limit. The repository checks this contract when it loads entities. The built-in `InMemoryStorage` is a simple example adapter; its query matching uses strict equality on each supplied field.

### `Cache<Entity>`

The cache adapter stores entities by string key. Implement `get`, `set`, `delete`, `size`, `getAll`, `setAll`, and `ping` as asynchronous operations. A missing `get` returns `null`; `getAll` returns a `Map<string, Entity>`.

The repository uses `get` for individual reads and `getAll` for bulk reads. It writes values after successful insert and update operations and deletes a cached value after a successful delete. The built-in `InMemoryMapCache` is useful for local development and tests.

### `Repository<Entity>`

The repository combines storage and cache into application-facing operations:

- `findById(id, options?)` reads through the cache and falls back to storage on a cache miss.
- `all(query?, options?)` returns a `Map<string, Entity>`, loading from storage and warming the cache on a cache miss.
- `insert(entity)`, `updateById(id, updates)`, and `deleteById(id)` write through to storage and then update the cache.

These methods return `null` when the relevant entity is absent or when the operation's storage adapter returns `null`. `all` returns a map, including an empty map when storage finds no entities.

### `RepositoryBuilder<Entity>`

Use the builder to supply required adapters and optional behavior, then call `build()`:

```ts
const repository = new RepositoryBuilder<User, UserRepository>(UserRepository)
  .setStorage(userStorage)
  .setCache(userCache)
  .setMaximumEntityCount(10_000)
  .build();
```

Storage and a primary cache are required. `setMaximumEntityCount` is needed before `all()` can load results when no explicit `limit` is provided. It is a safety bound against loading an unbounded result set into memory.

## Quick start

This example uses the bundled in-memory adapters. In a real application, replace `InMemoryStorage` and the cache with adapters for your database and cache service.

```ts
import {
  InMemoryMapCache,
  InMemoryStorage,
  Repository,
  RepositoryBuilder,
} from 'omnirepo';

interface User {
  _id: string;
  name: string;
  email: string;
}

class UserRepository extends Repository<User> {}

const user = { _id: 'user-1', name: 'Alex', email: 'alex@example.com' };
const users = new RepositoryBuilder<User, UserRepository>(UserRepository)
  .setStorage(new InMemoryStorage<User>([user]))
  .setCache(new InMemoryMapCache<User>())
  .setMaximumEntityCount(1_000)
  .build();

const found = await users.findById('user-1');
const created = await users.insert({
  _id: 'user-2',
  name: 'Sam',
  email: 'sam@example.com',
});
const matchingUsers = await users.all({ name: 'Alex' });
const updated = await users.updateById('user-1', { name: 'Alex Kim' });
const deleted = await users.deleteById('user-2');
```

The repository is generic, so a custom class can extend it with application-specific behavior. Override the protected `enrichEntities(entities)` method to enrich results consistently on reads and writes. It receives an array and must return an array of entities.

## Reading and pagination

`all(query?, options?)` accepts a partial entity as an equality query and `RepositoryReadOptions`:

```ts
const page = await users.all(
  { name: 'Alex' },
  { pagination: { limit: 25, skip: 50 } },
);

for (const [id, user] of page) {
  console.log(id, user.email);
}
```

`RepositoryReadOptions` supports:

- `pagination.limit`: maximum results to request from storage.
- `pagination.skip`: number of matching results to skip (defaults to `0`).
- `bypassCache`: skip cache reads and writes for this read.

`findById` also accepts `bypassCache`. Pagination values must be non-negative safe integers. When a maximum entity count is configured, an explicit `limit` cannot exceed it. When `all` has no explicit limit, it requests up to `maximumEntityCount` and checks for one extra result to detect overflow. A storage adapter returning more entities than requested is treated as an error.

Bulk results are keyed by `String(entity._id)`. Cache adapters should use the same key convention. `all` uses the complete cache map when it is non-empty; query and pagination are applied when loading from storage after a cache miss. Therefore, treat a populated cache as the bulk result for that repository rather than as a query-aware cache index. `bypassCache` is useful when the caller needs a storage-backed query or a fresh individual read.

An empty cache map is treated as a miss, so an empty result may be loaded from storage again on later calls.

## Cache failure policies

Cache failures are handled separately from storage failures. Storage errors propagate to the caller. Configure the cache degradation policy with `setDegradationPolicy`:

| Policy | Behavior when a cache operation fails |
| --- | --- |
| Default (unset) | Log the failure if a logger is configured and continue without the failed cache result. Reads can continue through storage. |
| `'throw'` | Propagate the cache error to the caller. |
| `'fallback'` | Promote the configured fallback cache after the first primary cache failure, then continue without the failed cache result. |

Fallback mode requires `setFallbackCache`. Promotion is permanent for the lifetime of that repository instance; it does not automatically retry the primary cache. If both caches are not viable, cache operations can continue to fail according to the active policy.

```ts
const repository = new RepositoryBuilder<User, UserRepository>(UserRepository)
  .setStorage(userStorage)
  .setCache(primaryCache)
  .setFallbackCache(secondaryCache)
  .setDegradationPolicy('fallback')
  .setLogger({
    error: (message, error) => console.error(message, error),
    info: message => console.info(message),
  })
  .setMaximumEntityCount(10_000)
  .build();
```

The default logger is silent. A custom `Logger` must implement `error(message, error?)` and `info(message)`.

## Redis hash cache

`RedisHashCache<Entity>` is a cache adapter that serializes entities as JSON in a Redis hash. Supply a client implementing `RedisHashCacheClient` and a Redis hash key as `storageKey`:

```ts
import { RedisHashCache } from 'omnirepo';
import type { RedisHashCacheClient } from 'omnirepo';

const cache = new RedisHashCache<User>({
  client: redisAdapter,
  storageKey: 'cache:users',
});
```

The client contract is deliberately independent of a Redis vendor SDK. Wrap your chosen client with `hgetField`, `hgetAll`, `hsetFields`, `hdeleteFields`, `hlen`, `replaceHash`, and `deleteKey`. Values must be JSON serializable. Invalid JSON read from Redis is treated as a cache miss for that field.

## Public API reference

The package exports:

- Classes: `Repository`, `RepositoryBuilder`, `InMemoryStorage`, `InMemoryMapCache`, `RedisHashCache`.
- Types: `WithId`, `Nullable<T>`, `Storage<Entity>`, `Cache<Entity>`, `RepositoryReadOptions`, `PaginationOptions`, `DegradationPolicy`, `Logger`, `RedisHashCacheArgs`, and `RedisHashCacheClient`.

`WithId` describes the required `_id` field (`unknown`); repository and storage entity types should use a more specific ID type where possible.

## For coding agents

When adding an integration or using this package in a client project:

1. Define an entity type with `_id` and implement `Storage<Entity>` for the durable source.
2. Implement `Cache<Entity>` or adapt a Redis client with `RedisHashCacheClient`.
3. Build the repository with both required adapters. Configure a finite `maximumEntityCount` before calling unbounded `all()`.
4. Choose a cache failure policy intentionally. `fallback` requires a fallback cache and promotes it permanently after a primary failure; `throw` propagates cache errors.
5. Ensure storage IDs, `String(entity._id)`, and cache keys agree. Ensure `find` honors requested pagination.
6. Remember that bulk cache hits return the cache's full map, without applying the requested query or pagination.

## Development

Use Yarn with Node.js 20.11 or newer.

```sh
yarn build
yarn typecheck
yarn lint
yarn test
```

`yarn test:unit` runs unit tests and `yarn test:integration` runs integration tests. `yarn clean` removes generated `dist/` output. The client sandbox examples are under `examples/`; they illustrate MongoDB storage and Redis client adapters and require their external services and environment variables.
