export class RedisHashCache {
    client;
    storageKey;
    constructor({ client, storageKey }) {
        this.client = client;
        this.storageKey = storageKey;
    }
    async get(key) {
        const serialized = await this.client.hgetField(this.storageKey, key);
        if (serialized === null) {
            return null;
        }
        return this.parseValue(serialized);
    }
    async set(key, value) {
        await this.client.hsetFields(this.storageKey, {
            [key]: this.serializeValue(value),
        });
    }
    async delete(key) {
        await this.client.hdeleteFields(this.storageKey, key);
    }
    async size() {
        return this.client.hlen(this.storageKey);
    }
    async getAll() {
        const serializedItems = await this.client.hgetAll(this.storageKey);
        const entries = new Map();
        for (const [key, serialized] of Object.entries(serializedItems)) {
            const value = this.parseValue(serialized);
            if (value !== null) {
                entries.set(key, value);
            }
        }
        return entries;
    }
    async setAll(data) {
        if (!data.size) {
            await this.client.deleteKey(this.storageKey);
            return;
        }
        const serializedItems = {};
        for (const [key, value] of data) {
            serializedItems[key] = this.serializeValue(value);
        }
        await this.client.replaceHash(this.storageKey, serializedItems);
    }
    async ping(key) {
        return (await this.client.hgetField(this.storageKey, key)) !== null;
    }
    parseValue(serialized) {
        try {
            return JSON.parse(serialized);
        }
        catch {
            return null;
        }
    }
    serializeValue(value) {
        const serialized = JSON.stringify(value);
        if (typeof serialized !== 'string') {
            throw new Error('Redis cache value must be JSON serializable');
        }
        return serialized;
    }
}
//# sourceMappingURL=RedisHashCache.js.map