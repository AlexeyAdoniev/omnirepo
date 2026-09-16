import type {
  Cache,
  DegradationPolicy,
  Nullable,
  Storage,
  WithId,
} from '../types.js';
import {chain, mapEntities} from '../helpers.js';

class BaseRepository<Entity extends WithId> extends EventTarget {
  private degradationPolicy: DegradationPolicy | undefined;
  private fallbackCache: Cache<Entity> | undefined;

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
      console.error('Cache operation failed:', error);

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

  protected async safeLoad(query: Partial<Entity> = {}): Promise<Entity[]> {
    if (this.maximumEntityCount === undefined) {
      throw new Error('Cache warm-up failed: Maximum entity count is not defined');
    }

    const count = await this.storage.count();

    if (count > this.maximumEntityCount) {
      throw new Error('Cache warm-up failed: Entity count exceeds maximum');
    }

    const entities = await this.storage.find(query, {
      limit: this.maximumEntityCount,
    });

    if (entities.length > this.maximumEntityCount) {
      throw new Error('Cache warm-up failed: Retrieved entity count exceeds maximum');
    }

    return entities;
  }

  protected async enrichEntities(entities: Entity[]): Promise<Entity[]> {
    //throw new Error('enrichEntities method must be implemented in the subclass');
    return entities;
  }

  async warmUpCache(query: Partial<Entity> = {}): Promise<void> {
    await chain(this.safeLoad(query))
      .next(entities => this.enrichEntities(entities))
      .aggregate(mapEntities)
      .tap(entities =>{
        console.log(entities, 'entities');
        this.runCacheOperation(cache => cache.setAll(entities));
      });
      // .catch(error => {
      //   console.error('Warm-up cache operation failed:', error);
      // });
  }
}

class Repository<Entity extends WithId> extends BaseRepository<Entity> {
  async all(): Promise<Map<string, Entity> | null> {
    const cached = await this.runCacheOperation(cache => cache.getAll());

    if (cached?.size) {
      return cached;
    }

    const entities = await this.safeLoad();
    const entitiesMap = mapEntities(entities);
    await this.runCacheOperation(cache => cache.setAll(entitiesMap));
    return entitiesMap;
  }

  async findById(id: string): Promise<Nullable<Entity>> {
    const cached = await this.runCacheOperation(cache => cache.get(id));

    if (cached) {
      return cached;
    }

    const entity = await this.storage.findById(id);

    if (entity) {
      await this.runCacheOperation(cache => cache.set(id, entity));
    }

    return entity;
  }

  async updateById(
    id: string,
    updates: Partial<Entity>,
  ): Promise<Nullable<Entity>> {
    const entity = await this.storage.updateById(id, updates);
    if (entity) {
      await this.runCacheOperation(cache => cache.set(id, entity));
    }
    return entity;
  }

  async insert(entity: Entity): Promise<Nullable<Entity>> {
    const inserted = await this.storage.insert(entity);
    if (inserted === null) {
      return null;
    }

    await this.runCacheOperation(cache =>
      cache.set(String(inserted._id), inserted),
    );

    return inserted;
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
