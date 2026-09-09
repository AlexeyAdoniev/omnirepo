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
            false && setInterval(async () => {
              try {
                console.log(this.degradationPolicy, 'x');
                //const result = await cache.ping();
              } catch (error) {
                console.error('Fallback cache ping failed:', error);
              }
            }, 10_000); // Attempt to recover the initial cache every second
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

export {Repository};
