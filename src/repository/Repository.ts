import type {
  Cache,
  DegradationPolicy,
  Nullable,
  Storage,
  WithId,
} from '../types.js';

class BaseRepository<Entity extends WithId> extends EventTarget {
  private degradationPolicy: DegradationPolicy | undefined;
  private fallbackCache: Cache<Entity> | undefined;

  constructor(
    protected readonly storage: Storage<Entity>,
    protected cache: Cache<Entity>,
  ) {
    super();
  }

  setFallbackCache(cache: Cache<Entity>) {
    this.fallbackCache = cache;
  }

  setDegradationPolicy(policy: DegradationPolicy) {
    this.degradationPolicy = policy;
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
          if (this.fallbackCache) {
            const cache = this.cache;
            this.cache = this.fallbackCache;
            this.fallbackCache = cache;
            // TODO recovery of initial cache
          }
          return null;
        }
        case 'throw':
          throw error;
        default:
          return null;
      }
    }
  }
}

class Repository<Entity extends WithId> extends BaseRepository<Entity> {
  async findById(id: string): Promise<Nullable<Entity>> {
    try {
      const cached = await this.runCacheOperation(cache => cache.get(id));

      if (cached) {
        return cached;
      }

      return await this.storage.findById(id);
    } catch {
      return null;
    }
  }
}

export class RepositoryBuilder<Entity extends WithId> {
  storage?: Storage<Entity>;
  cache?: Cache<Entity>;
  fallbackCache?: Cache<Entity>;
  degradationPolicy?: DegradationPolicy;

  setStorage(storage: Storage<Entity>) {
    this.storage = storage;
    return this;
  }

  setCache(cache: Cache<Entity>) {
    this.cache = cache;
    return this;
  }

  setFallbackCache(cache: Cache<Entity>) {
    this.fallbackCache = cache;
    return this;
  }

  setDegradationPolicy(policy: DegradationPolicy) {
    this.degradationPolicy = policy;
    return this;
  }

  build(): Repository<Entity> {
    if (!this.storage) {
      throw new Error('Storage is required');
    }

    if (!this.cache) {
      throw new Error('Cache is required');
    }

    if (this.degradationPolicy === 'fallback' && !this.fallbackCache) {
      throw new Error('Fallback cache is required for fallback degradation policy');
    }

    const repository = new Repository<Entity>(this.storage, this.cache);

    if (this.degradationPolicy !== undefined) {
      repository.setDegradationPolicy(this.degradationPolicy);
    }

    if (this.fallbackCache !== undefined) {
      repository.setFallbackCache(this.fallbackCache);
    }

    return repository;
  }
}
