import type {Storage, FindOptions} from '../types.js';

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
  async count(): Promise<number> {
    return this.entries.size;
  }

  async findById(id: string): Promise<Entity | null> {
    return this.entries.get(id) ?? null;
  }

  async find(query: Partial<Entity>, options?: FindOptions): Promise<Entity[]> {
    const skip = options?.skip ?? 0;
    return Array.from(this.entries.values()).filter(entity =>
      this.matchesQuery(entity, query),
    ).slice(skip, skip + (options?.limit ?? Infinity));
  }

  async updateById(
    id: string,
    entity: Partial<Entity>,
  ): Promise<Entity | null> {
    const existing = this.entries.get(id);

    if (!existing) {
      return null;
    }

    const updatedEntity = {...existing, ...entity};
    this.entries.set(id, updatedEntity);
    return updatedEntity;
  }

  async insert(entity: Entity): Promise<Entity> {
    this.entries.set(this.toKey(entity._id), entity);
    return entity;
  }

  async deleteById(id: string): Promise<Entity | null> {
    const entity = this.entries.get(id);

    if (!entity) {
      return null;
    }

    this.entries.delete(id);
    return entity;
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

  private toKey(id: Entity['_id']): string {
    return String(id);
  }
}
