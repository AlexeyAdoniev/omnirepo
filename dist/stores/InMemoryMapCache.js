export class InMemoryMapCache {
    entries;
    constructor(initialData) {
        this.entries = new Map(initialData);
    }
    async get(key) {
        return this.entries.get(key) ?? null;
    }
    async set(key, value) {
        this.entries.set(key, value);
    }
    async delete(key) {
        this.entries.delete(key);
    }
    async size() {
        return this.entries.size;
    }
    async getAll() {
        return new Map(this.entries);
    }
    async setAll(data) {
        this.entries.clear();
        for (const [key, value] of data) {
            this.entries.set(key, value);
        }
    }
    async ping(key) {
        return this.entries.has(key);
    }
}
//# sourceMappingURL=InMemoryMapCache.js.map