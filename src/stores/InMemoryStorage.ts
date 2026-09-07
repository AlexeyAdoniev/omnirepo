import type {Storage} from "../types.js";

export class InMemoryStorage<Entity extends {_id: unknown}>
  implements Storage<Entity>
{
  private readonly entries: Map<string, Entity>;

  constructor(initialData?: Iterable<Entity>) {
    this.entries = new Map();

    if (initialData) {
      for (const entity of initialData) {
        this.entries.set(this.toKey(entity._id), entity);
      }
    }
  }

  async findById(id: string): Promise<Entity | null> {
    return this.entries.get(id) ?? null;
  }

  async find(query: Partial<Entity>): Promise<Entity[]> {
    return Array.from(this.entries.values()).filter(entity =>
      this.matchesQuery(entity, query),
    );
  }

  async updateById(id: string, entity: Partial<Entity>): Promise<void> {
    const existing = this.entries.get(id);

    if (!existing) {
      return;
    }

    this.entries.set(id, {...existing, ...entity});
  }

  async insert(entity: Entity): Promise<void> {
    this.entries.set(this.toKey(entity._id), entity);
  }

  async deleteById(id: string): Promise<void> {
    this.entries.delete(id);
  }

  private matchesQuery(entity: Entity, query: Partial<Entity>): boolean {
    for (const [key, value] of Object.entries(query) as Array<
      [keyof Entity, Entity[keyof Entity] | undefined]
    >) {
      if (entity[key] !== value) {
        return false;
      }
    }

    return true;
  }

  private toKey(id: Entity["_id"]): string {
    return String(id);
  }
}
