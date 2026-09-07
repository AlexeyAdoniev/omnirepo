export interface WithId {
  _id: unknown;
}

export type Nullable<T> = T | null;

export type DegradationPolicy =  'fallback' | 'throw';



export interface Cache<Entity> {
  get(key: string): Promise<Nullable<Entity>>;
  delete(key: string): Promise<void>;
  size(): Promise<number>;
  getAll(): Promise<Map<string, Entity>>;
  set(data: Map<string, Entity>): Promise<void>;
  ping(key: string): Promise<boolean>;
}

export interface Storage<Entity extends WithId> {
  findById(id: string): Promise<Nullable<Entity>>;
  find(query: Partial<Entity>): Promise<Entity[]>;
  updateById(id: string, entity: Partial<Entity>): Promise<void>;
  insert(entity: Entity): Promise<void>;
  deleteById(id: string): Promise<void>;
}
