import type {Cache} from "../types.js";

export class InMemoryCache<Entity> implements Cache<Entity> {
  private readonly entries: Map<string, Entity>;

  constructor(initialData?: ReadonlyMap<string, Entity>) {
    this.entries = new Map(initialData);
  }

  async get(key: string): Promise<Entity | null> {
    return this.entries.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  async size(): Promise<number> {
    return this.entries.size;
  }

  async getAll(): Promise<Map<string, Entity>> {
    return new Map(this.entries);
  }

  async set(data: Map<string, Entity>): Promise<void> {
    this.entries.clear();

    for (const [key, value] of data) {
      this.entries.set(key, value);
    }
  }

  async ping(key: string): Promise<boolean> {
    return this.entries.has(key);
  }
}
