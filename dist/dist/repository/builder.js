import { Repository } from './Repository.js';
export class RepositoryBuilder {
    RepositoryClass;
    storage;
    cache;
    fallbackCache;
    degradationPolicy;
    logger;
    maximumEntityCount;
    constructor(RepositoryClass) {
        this.RepositoryClass = RepositoryClass;
    }
    setStorage(storage) {
        this.storage = storage;
        return this;
    }
    setCache(cache) {
        this.cache = cache;
        return this;
    }
    setFallbackCache(cache) {
        this.fallbackCache = cache;
        return this;
    }
    setMaximumEntityCount(maximumEntityCount) {
        if (!Number.isSafeInteger(maximumEntityCount) || maximumEntityCount < 0) {
            throw new Error('Maximum entity count must be a non-negative integer');
        }
        this.maximumEntityCount = maximumEntityCount;
        return this;
    }
    setDegradationPolicy(policy) {
        this.degradationPolicy = policy;
        return this;
    }
    setLogger(logger) {
        this.logger = logger;
        return this;
    }
    build() {
        if (!this.storage) {
            throw new Error('Storage is required');
        }
        if (!this.cache) {
            throw new Error('Cache is required');
        }
        if (this.degradationPolicy === 'fallback' && !this.fallbackCache) {
            throw new Error('Fallback cache is required for fallback degradation policy');
        }
        const repository = new this.RepositoryClass(this.storage, this.cache, this.maximumEntityCount);
        if (this.degradationPolicy !== undefined) {
            repository.setDegradationPolicy(this.degradationPolicy);
        }
        if (this.logger !== undefined) {
            repository.setLogger(this.logger);
        }
        if (this.fallbackCache !== undefined) {
            repository.setFallbackCache(this.fallbackCache);
        }
        return repository;
    }
}
//# sourceMappingURL=builder.js.map