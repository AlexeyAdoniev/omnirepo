
import {Redis} from 'ioredis';

type RedisConnectionOptions = {
    tls?: {
        rejectUnauthorized: boolean;
    };
    maxRetriesPerRequest?: number;
};

 const withTimeout = async <T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
): Promise<T> => {

    let timeoutHandle: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).then((result) => {
        clearTimeout(timeoutHandle);
        return result;
    }).catch((error) => {
        clearTimeout(timeoutHandle);
        throw error;
    });
}

const REDIS_PING_TIMEOUT_MS = 5000;

type RedisStoreOptions = {
    maxRetriesPerRequest?: number;
}

abstract class RedisBase {
    protected readonly url: string;
    protected readonly options: RedisConnectionOptions;

    protected createClient(): Redis {
        //console.log(this.options);
        const client = new Redis(this.url, this.options);
        client.on('error', () => { });
        return client;
    }

    constructor(url: string) {
        const isTLS = url.startsWith('rediss://');
        this.url = url;
        this.options = isTLS ? { tls: { rejectUnauthorized: false } } : {};
    }

    protected abstract getInitClient(): Redis;

    async init(client?: Redis): Promise<string> {
        const _client = client ?? this.getInitClient();
        return await withTimeout(_client.ping(), REDIS_PING_TIMEOUT_MS, 'Redis ping timeout');
    }

    public abstract close(): Promise<void>;
}

class RedisStore extends RedisBase {
    private client: Redis;
    private reconnectPromise: Promise<boolean> | null = null;

    constructor(url: string, storeOptions?: RedisStoreOptions) {
        super(url);
        if (typeof storeOptions?.maxRetriesPerRequest === 'number') {
            this.options.maxRetriesPerRequest = storeOptions.maxRetriesPerRequest;
        }
        this.client = this.createClient();
    }


    getClient(): Redis {
        return this.client;
    }

    protected getInitClient(): Redis {
        return this.client;
    }

    async close(): Promise<void> {
        await this.client.quit();
    }

    async reconnect(): Promise<boolean> {
        if (this.reconnectPromise) return await this.reconnectPromise;

        this.reconnectPromise = (async () => {
            const previousClient = this.client;
            const nextClient = this.createClient();

            try {
                await this.init(nextClient);
                this.client = nextClient;
                previousClient.disconnect();
                return true;
            } catch {
                this.client = previousClient;
                nextClient.disconnect();
                return false;
            }
        })().finally(() => {
            this.reconnectPromise = null;
        });

        return await this.reconnectPromise;
    }

    async evalScript<T>(script: string, numkeys: number, args: string[]): Promise<T | null> {
        const result = await this.client.eval(script, numkeys, args) as T | null;
        return result ?? null;
    }

    async hgetFields(key: string, ...fields: string[]): Promise<(string | null)[]> {
        return await this.client.hmget(key, ...fields);
    }

    async hgetField(key: string, field: string): Promise<string | null> {
        return await this.client.hget(key, field);
    }

    async hgetAll(key: string): Promise<Record<string, string>> {
        return await this.client.hgetall(key);
    }

    async hsetFields(key: string, data: Record<string, string | number>): Promise<void> {
        await this.client.hset(key, data);
    }

    async hsetMany(entries: Array<{ key: string; data: Record<string, string | number> }>): Promise<void> {
        const pipeline = this.client.pipeline();

        for (const { key, data } of entries) {
            pipeline.hset(key, data);
        }

        await pipeline.exec();
    }

    async hdeleteFields(key: string, ...fields: string[]): Promise<void> {
        if (!fields.length) {
            return;
        }

        await this.client.hdel(key, ...fields);
    }

    async hlen(key: string): Promise<number> {
        return await this.client.hlen(key);
    }

    async replaceHash(key: string, data: Record<string, string | number>): Promise<void> {
        const tempKey = `${key}:tmp:${process.pid}:${Date.now()}`;

        await this.client.multi()
            .del(tempKey)
            .hset(tempKey, data)
            .rename(tempKey, key)
            .exec();
    }

    async deleteKey(keys: string | string[]): Promise<number> {
        const normalizedKeys = Array.isArray(keys) ? keys : [keys];
        return await this.client.del(normalizedKeys);
    }

    async setKey(key: string, value: string, ttlMs?: number): Promise<void> {
        if (ttlMs) {
            await this.client.set(key, value, 'PX', ttlMs);
        } else {
            await this.client.set(key, value);
        }
    }

    async getKey(key: string): Promise<string | null> {
        return await this.client.get(key);
    }

    async existsKeys(keys: string | string[]): Promise<number> {
        const normalizedKeys = Array.isArray(keys) ? keys : [keys];
        return await this.client.exists(normalizedKeys);
    }

    async getKeys(keys: string[]): Promise<(string | null)[]> {
        return await this.client.mget(keys);
    }

    async setKeys(entries: Array<{ key: string; value: string; ttlMs?: number }>): Promise<void> {
        const pipeline = this.client.pipeline();
        for (const { key, value, ttlMs } of entries) {
            if (ttlMs) {
                pipeline.set(key, value, 'PX', ttlMs);
            } else {
                pipeline.set(key, value);
            }
        }
        await pipeline.exec();
    }

    async dbSize(): Promise<number> {
        return await this.client.dbsize();
    }



    async deleteKeysByPattern(pattern: string): Promise<number> {
        let cursor = '0';
        let deletedCount = 0;
        do {
            const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
            cursor = nextCursor;
            if (keys.length > 0) {
                deletedCount += await this.client.del(keys);
            }
        } while (cursor !== '0');
        return deletedCount;
    }

    async getTTL(key: string): Promise<number | null> {
        const ttl = await this.client.pttl(key);
        return ttl >= 0 ? ttl : null;
    }

    async scan(pattern: string, count: number = 500): Promise<string[]> {
        let cursor = '0';
        const keys: string[] = [];
        do {
            const [nextCursor, foundKeys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
            cursor = nextCursor;
            keys.push(...foundKeys);
        } while (cursor !== '0');
        return keys;
    }

}

export default RedisStore
