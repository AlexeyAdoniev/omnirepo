import type {
  Cache,
  DegradationPolicy,
  Logger,
  Nullable,
  PaginationOptions,
  RepositoryReadOptions,
  Storage,
  WithId,
} from '../types.js';
import {chain, mapEntities} from '../helpers.js';
import {
  ENTITY_COUNT_EXCEEDS_MAXIMUM,
  INVALID_MAXIMUM_ENTITY_COUNT,
  INVALID_PAGINATION_LIMIT,
  INVALID_PAGINATION_SKIP,
  MAXIMUM_ENTITY_COUNT_REQUIRED,
  PAGINATION_LIMIT_EXCEEDS_MAXIMUM,
  STORAGE_RETURNED_TOO_MANY_ENTITIES,
} from './RepositoryErrors.js';

const SILENT_LOGGER: Logger = {
  error: () => {},
  info: () => {},
};

class BaseRepository<Entity extends WithId> extends EventTarget {
  private degradationPolicy: DegradationPolicy | undefined;
  private fallbackCache: Cache<Entity> | undefined;
  private logger: Logger = SILENT_LOGGER;

  constructor(
    protected readonly storage: Storage<Entity>,
    protected cache: Cache<Entity>,
    protected readonly maximumEntityCount?: number,
  ) {
    super();
  }

  setFallbackCache(cache: Cache<Entity>): void {
    this.fallbackCache = cache;
  }

  setDegradationPolicy(policy: DegradationPolicy): void {
    this.degradationPolicy = policy;
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  private activateFallbackCache(): void {
    if (this.fallbackCache) {
      this.cache = this.fallbackCache;
      this.fallbackCache = undefined;
    }
  }

  protected async runCacheOperation<T>(
    request: (cache: Cache<Entity>) => Promise<T>,
  ): Promise<T | null> {
    try {
      return await request(this.cache);
    } catch (error) {
      this.logger.error('Cache operation failed', error);

      switch (this.degradationPolicy) {
        case 'fallback': {
          this.activateFallbackCache();
          return null;
        }
        case 'throw':
          throw error;
        default:
          return null;
      }
    }
  }

  protected async safeLoad(
  query: Partial<Entity> = {},
  { limit, skip = 0 }: PaginationOptions = {},
): Promise<Entity[]> {
  const maximumEntityCount = this.maximumEntityCount;

  if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 0)) {
    throw INVALID_PAGINATION_LIMIT;
  }

  if (!Number.isSafeInteger(skip) || skip < 0) {
    throw INVALID_PAGINATION_SKIP;
  }

  if (
    maximumEntityCount !== undefined &&
    (!Number.isSafeInteger(maximumEntityCount) || maximumEntityCount < 0)
  ) {
    throw INVALID_MAXIMUM_ENTITY_COUNT;
  }

  const isLoadingAll = limit === undefined;

  if (isLoadingAll && maximumEntityCount === undefined) {
    throw MAXIMUM_ENTITY_COUNT_REQUIRED;
  }

  if (
    limit !== undefined &&
    maximumEntityCount !== undefined &&
    limit > maximumEntityCount
  ) {
    throw PAGINATION_LIMIT_EXCEEDS_MAXIMUM;
  }

  const effectiveLimit = limit ?? maximumEntityCount!;

  // Fetch one extra entity when loading all results so we can detect
  // overflow without retrieving the entire result set into memory.
  const fetchLimit = isLoadingAll
    ? effectiveLimit + 1
    : effectiveLimit;

  const entities = await this.storage.find(query, {
    limit: fetchLimit,
    skip,
  });

  if (entities.length > effectiveLimit) {
    if (isLoadingAll) {
      throw ENTITY_COUNT_EXCEEDS_MAXIMUM;
    }

    throw STORAGE_RETURNED_TOO_MANY_ENTITIES;
  }

  return entities;
}

  protected async enrichEntities(entities: Entity[]): Promise<Entity[]> {
    return entities;
  }
}

class Repository<Entity extends WithId> extends BaseRepository<Entity> {
  private enrichEntity(
    result: Promise<Nullable<Entity>>,
  ) {
    return chain(result).next(async entity => {
      if (!entity) {
        return null;
      }

      const [enrichedEntity] = await this.enrichEntities([entity]);
      return enrichedEntity ?? null;
    });
  }

  async all(
    query: Partial<Entity> = {},
    options: RepositoryReadOptions = {},
  ): Promise<Map<string, Entity> | null> {
    const cached = options.bypassCache
      ? null
      : await this.runCacheOperation(cache => cache.getAll());

    if (cached?.size) {
      return cached;
    }

    return chain(this.safeLoad(query, options.pagination))
      .next(entities => this.enrichEntities(entities))
      .map(mapEntities)
      .execute(entities =>
        options.bypassCache
          ? null
          : this.runCacheOperation(cache => cache.setAll(entities)),
      );
  }

  async findById(
    id: string,
    options: RepositoryReadOptions = {},
  ): Promise<Nullable<Entity>> {
    const cached = options.bypassCache
      ? null
      : await this.runCacheOperation(cache => cache.get(id));

    if (cached) {
      return cached;
    }

    return this.enrichEntity(this.storage.findById(id))
      .execute(entity =>
        entity && !options.bypassCache
          ? this.runCacheOperation(cache => cache.set(id, entity))
          : null,
      );
  }

  async updateById(
    id: string,
    updates: Partial<Entity>,
  ): Promise<Nullable<Entity>> {
    return this.enrichEntity(this.storage.updateById(id, updates))
      .execute(entity =>
        entity ? this.runCacheOperation(cache => cache.set(id, entity)) : null,
      );
  }

  async insert(entity: Entity): Promise<Nullable<Entity>> {
    return this.enrichEntity(this.storage.insert(entity))
      .execute(inserted =>
        inserted
          ? this.runCacheOperation(cache =>
              cache.set(String(inserted._id), inserted),
            )
          : null,
      );
  }

  async deleteById(id: string): Promise<Nullable<Entity>> {
    const deleted = await this.storage.deleteById(id);
    if (deleted) {
      await this.runCacheOperation(cache => cache.delete(id));
    }
    return deleted;
  }
}

export {Repository};
