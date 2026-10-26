import type { Cache, DegradationPolicy, Logger, Storage, WithId } from '../types.js';
import { Repository } from './Repository.js';
type RepositoryConstructor<Entity extends WithId, RepositoryType extends Repository<Entity>> = new (storage: Storage<Entity>, cache: Cache<Entity>, maximumEntityCount?: number) => RepositoryType;
export declare class RepositoryBuilder<Entity extends WithId, RepositoryType extends Repository<Entity> = Repository<Entity>> {
    private readonly RepositoryClass;
    storage?: Storage<Entity>;
    cache?: Cache<Entity>;
    fallbackCache?: Cache<Entity> | undefined;
    degradationPolicy?: DegradationPolicy | undefined;
    logger?: Logger | undefined;
    maximumEntityCount?: number | undefined;
    constructor(RepositoryClass: RepositoryConstructor<Entity, RepositoryType>);
    setStorage(storage: Storage<Entity>): this;
    setCache(cache: Cache<Entity>): this;
    setFallbackCache(cache: Cache<Entity>): this;
    setMaximumEntityCount(maximumEntityCount: number): this;
    setDegradationPolicy(policy: DegradationPolicy): this;
    setLogger(logger: Logger): this;
    build(): RepositoryType;
}
export {};
//# sourceMappingURL=builder.d.ts.map