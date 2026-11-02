import type { PaginationOptions, Storage } from '../types.js';
export declare class InMemoryStorage<Entity extends {
    _id: unknown;
}> implements Storage<Entity> {
    private readonly entries;
    constructor(initialData?: Iterable<Entity>);
    count(query?: Partial<Entity>): Promise<number>;
    findById(id: string): Promise<Entity | null>;
    find(query: Partial<Entity>, options?: PaginationOptions): Promise<Entity[]>;
    updateById(id: string, entity: Partial<Entity>): Promise<Entity | null>;
    insert(entity: Entity): Promise<Entity>;
    deleteById(id: string): Promise<Entity | null>;
    private matchesQuery;
    private toKey;
}
//# sourceMappingURL=InMemoryStorage.d.ts.map