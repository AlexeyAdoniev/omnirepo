import type { Cache } from '../types.js';
export declare class InMemoryMapCache<Entity> implements Cache<Entity> {
    private readonly entries;
    constructor(initialData?: ReadonlyMap<string, Entity>);
    get(key: string): Promise<Entity | null>;
    set(key: string, value: Entity): Promise<void>;
    delete(key: string): Promise<void>;
    size(): Promise<number>;
    getAll(): Promise<Map<string, Entity>>;
    setAll(data: Map<string, Entity>): Promise<void>;
    ping(key: string): Promise<boolean>;
}
//# sourceMappingURL=InMemoryMapCache.d.ts.map