import type { Cache } from '../types.js';
export interface RedisHashCacheClient {
    hgetField(key: string, field: string): Promise<string | null>;
    hgetAll(key: string): Promise<Record<string, string>>;
    hsetFields(key: string, data: Record<string, string>): Promise<void>;
    hdeleteFields(key: string, ...fields: string[]): Promise<void>;
    hlen(key: string): Promise<number>;
    replaceHash(key: string, data: Record<string, string>): Promise<void>;
    deleteKey(key: string): Promise<number>;
}
export interface RedisHashCacheArgs {
    client: RedisHashCacheClient;
    storageKey: string;
}
export declare class RedisHashCache<Entity> implements Cache<Entity> {
    private readonly client;
    private readonly storageKey;
    constructor({ client, storageKey }: RedisHashCacheArgs);
    get(key: string): Promise<Entity | null>;
    set(key: string, value: Entity): Promise<void>;
    delete(key: string): Promise<void>;
    size(): Promise<number>;
    getAll(): Promise<Map<string, Entity>>;
    setAll(data: Map<string, Entity>): Promise<void>;
    ping(key: string): Promise<boolean>;
    private parseValue;
    private serializeValue;
}
//# sourceMappingURL=RedisHashCache.d.ts.map