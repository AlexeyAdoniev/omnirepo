export interface WithId {
  _id: unknown;
}

export type Nullable<T> = T | null;

export type DegradationPolicy =  'fallback' | 'throw';

export interface FindOptions {
  limit?: number;
  skip?: number;
}

export interface Cache<Entity> {
  get(key: string): Promise<Nullable<Entity>>;
  set(key: string, value: Entity): Promise<void>;
  delete(key: string): Promise<void>;
  size(): Promise<number>;
  getAll(): Promise<Map<string, Entity>>;
  setAll(data: Map<string, Entity>): Promise<void>;
  ping(key: string): Promise<boolean>;
}

export interface Storage<Entity extends WithId> {
  count(): Promise<number>;
  findById(id: string): Promise<Nullable<Entity>>;
  find(query: Partial<Entity>, options?: FindOptions): Promise<Entity[]>;
  updateById(id: string, entity: Partial<Entity>): Promise<Nullable<Entity>>;
  insert(entity: Entity): Promise<Nullable<Entity>>;
  deleteById(id: string): Promise<Nullable<Entity>>;
}
