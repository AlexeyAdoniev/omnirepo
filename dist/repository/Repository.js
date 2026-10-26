import { chain, mapEntities } from '../helpers.js';
import { ENTITY_COUNT_EXCEEDS_MAXIMUM, INVALID_MAXIMUM_ENTITY_COUNT, INVALID_PAGINATION_LIMIT, INVALID_PAGINATION_SKIP, MAXIMUM_ENTITY_COUNT_REQUIRED, PAGINATION_LIMIT_EXCEEDS_MAXIMUM, STORAGE_RETURNED_TOO_MANY_ENTITIES, } from './RepositoryErrors.js';
const SILENT_LOGGER = {
    error: () => { },
    info: () => { },
};
class BaseRepository extends EventTarget {
    storage;
    cache;
    maximumEntityCount;
    degradationPolicy;
    fallbackCache;
    logger = SILENT_LOGGER;
    constructor(storage, cache, maximumEntityCount) {
        super();
        this.storage = storage;
        this.cache = cache;
        this.maximumEntityCount = maximumEntityCount;
    }
    setFallbackCache(cache) {
        this.fallbackCache = cache;
    }
    setDegradationPolicy(policy) {
        this.degradationPolicy = policy;
    }
    setLogger(logger) {
        this.logger = logger;
    }
    activateFallbackCache() {
        if (this.fallbackCache) {
            this.cache = this.fallbackCache;
            this.fallbackCache = undefined;
        }
    }
    async runCacheOperation(request) {
        try {
            return await request(this.cache);
        }
        catch (error) {
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
    async safeLoad(query = {}, { limit, skip = 0 } = {}) {
        const maximumEntityCount = this.maximumEntityCount;
        if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 0)) {
            throw INVALID_PAGINATION_LIMIT;
        }
        if (!Number.isSafeInteger(skip) || skip < 0) {
            throw INVALID_PAGINATION_SKIP;
        }
        if (maximumEntityCount !== undefined &&
            (!Number.isSafeInteger(maximumEntityCount) || maximumEntityCount < 0)) {
            throw INVALID_MAXIMUM_ENTITY_COUNT;
        }
        const isLoadingAll = limit === undefined;
        if (isLoadingAll && maximumEntityCount === undefined) {
            throw MAXIMUM_ENTITY_COUNT_REQUIRED;
        }
        if (limit !== undefined &&
            maximumEntityCount !== undefined &&
            limit > maximumEntityCount) {
            throw PAGINATION_LIMIT_EXCEEDS_MAXIMUM;
        }
        const effectiveLimit = limit ?? maximumEntityCount;
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
    async enrichEntities(entities) {
        return entities;
    }
}
class Repository extends BaseRepository {
    enrichEntity(result) {
        return chain(result).next(async (entity) => {
            if (!entity) {
                return null;
            }
            const [enrichedEntity] = await this.enrichEntities([entity]);
            return enrichedEntity ?? null;
        });
    }
    async all(query = {}, options = {}) {
        const cached = options.bypassCache
            ? null
            : await this.runCacheOperation(cache => cache.getAll());
        if (cached?.size) {
            return cached;
        }
        return chain(this.safeLoad(query, options.pagination))
            .next(entities => this.enrichEntities(entities))
            .map(mapEntities)
            .execute(entities => options.bypassCache
            ? null
            : this.runCacheOperation(cache => cache.setAll(entities)));
    }
    async findById(id, options = {}) {
        const cached = options.bypassCache
            ? null
            : await this.runCacheOperation(cache => cache.get(id));
        if (cached) {
            return cached;
        }
        return this.enrichEntity(this.storage.findById(id))
            .execute(entity => entity && !options.bypassCache
            ? this.runCacheOperation(cache => cache.set(id, entity))
            : null);
    }
    async updateById(id, updates) {
        return this.enrichEntity(this.storage.updateById(id, updates))
            .execute(entity => entity ? this.runCacheOperation(cache => cache.set(id, entity)) : null);
    }
    async insert(entity) {
        return this.enrichEntity(this.storage.insert(entity))
            .execute(inserted => inserted
            ? this.runCacheOperation(cache => cache.set(String(inserted._id), inserted))
            : null);
    }
    async deleteById(id) {
        const deleted = await this.storage.deleteById(id);
        if (deleted) {
            await this.runCacheOperation(cache => cache.delete(id));
        }
        return deleted;
    }
}
export { Repository };
//# sourceMappingURL=Repository.js.map