import type {
  Cache,
  DegradationPolicy,
  Storage,
  WithId,
} from '../types.js';
import {Repository} from './Repository.js';

export class RepositoryBuilder<Entity extends WithId> {
  storage?: Storage<Entity>;
  cache?: Cache<Entity>;
  fallbackCache?: Cache<Entity> | undefined;
  degradationPolicy?: DegradationPolicy | undefined;
  maximumEntityCount?: number | undefined;

  setStorage(storage: Storage<Entity>): this {
    this.storage = storage;
    return this;
  }

  setCache(cache: Cache<Entity>): this {
    this.cache = cache;
    return this;
  }

  setFallbackCache(cache: Cache<Entity>): this {
    this.fallbackCache = cache;
    return this;
  }

  setMaximumEntityCount(maximumEntityCount: number): this {
    if (!Number.isSafeInteger(maximumEntityCount) || maximumEntityCount < 0) {
      throw new Error('Maximum entity count must be a non-negative integer');
    }

    this.maximumEntityCount = maximumEntityCount;
    return this;
  }

  setDegradationPolicy(policy: DegradationPolicy): this {
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

    const repository = new Repository<Entity>(
      this.storage,
      this.cache,
      this.maximumEntityCount,
    );

    if (this.degradationPolicy !== undefined) {
      repository.setDegradationPolicy(this.degradationPolicy);
    }

    if (this.fallbackCache !== undefined) {
      repository.setFallbackCache(this.fallbackCache);
    }

    return repository;
  }
}
