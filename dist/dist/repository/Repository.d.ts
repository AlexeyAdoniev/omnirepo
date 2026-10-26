import type { Cache, DegradationPolicy, Logger, Nullable, PaginationOptions, RepositoryReadOptions, Storage, WithId } from '../types.js';
declare class BaseRepository<Entity extends WithId> extends EventTarget {
    protected readonly storage: Storage<Entity>;
    protected cache: Cache<Entity>;
    protected readonly maximumEntityCount?: number | undefined;
    private degradationPolicy;
    private fallbackCache;
    private logger;
    constructor(storage: Storage<Entity>, cache: Cache<Entity>, maximumEntityCount?: number | undefined);
    setFallbackCache(cache: Cache<Entity>): void;
    setDegradationPolicy(policy: DegradationPolicy): void;
    setLogger(logger: Logger): void;
    private activateFallbackCache;
    protected runCacheOperation<T>(request: (cache: Cache<Entity>) => Promise<T>): Promise<T | null>;
    protected safeLoad(query?: Partial<Entity>, { limit, skip }?: PaginationOptions): Promise<Entity[]>;
    protected enrichEntities(entities: Entity[]): Promise<Entity[]>;
}
declare class Repository<Entity extends WithId> extends BaseRepository<Entity> {
    private enrichEntity;
    all(query?: Partial<Entity>, options?: RepositoryReadOptions): Promise<Map<string, Entity> | null>;
    findById(id: string, options?: RepositoryReadOptions): Promise<Nullable<Entity>>;
    updateById(id: string, updates: Partial<Entity>): Promise<Nullable<Entity>>;
    insert(entity: Entity): Promise<Nullable<Entity>>;
    deleteById(id: string): Promise<Nullable<Entity>>;
}
export { Repository };
//# sourceMappingURL=Repository.d.ts.map