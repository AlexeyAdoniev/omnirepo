export class InMemoryStorage {
    entries;
    constructor(initialData) {
        this.entries = new Map();
        if (initialData) {
            for (const entity of initialData) {
                this.entries.set(this.toKey(entity._id), entity);
            }
        }
    }
    async count(query = {}) {
        return Array.from(this.entries.values()).filter(entity => this.matchesQuery(entity, query)).length;
    }
    async findById(id) {
        return this.entries.get(id) ?? null;
    }
    async find(query, options) {
        const skip = options?.skip ?? 0;
        return Array.from(this.entries.values()).filter(entity => this.matchesQuery(entity, query)).slice(skip, skip + (options?.limit ?? Infinity));
    }
    async updateById(id, entity) {
        const existing = this.entries.get(id);
        if (!existing) {
            return null;
        }
        const updatedEntity = { ...existing, ...entity };
        this.entries.set(id, updatedEntity);
        return updatedEntity;
    }
    async insert(entity) {
        this.entries.set(this.toKey(entity._id), entity);
        return entity;
    }
    async deleteById(id) {
        const entity = this.entries.get(id);
        if (!entity) {
            return null;
        }
        this.entries.delete(id);
        return entity;
    }
    matchesQuery(entity, query) {
        for (const [key, value] of Object.entries(query)) {
            if (entity[key] !== value) {
                return false;
            }
        }
        return true;
    }
    toKey(id) {
        return String(id);
    }
}
//# sourceMappingURL=InMemoryStorage.js.map