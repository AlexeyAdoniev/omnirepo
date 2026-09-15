import type {Cache} from '../types.js';

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

export class RedisHashCache<Entity> implements Cache<Entity> {
  private readonly client: RedisHashCacheClient;
  private readonly storageKey: string;

  constructor({client, storageKey}: RedisHashCacheArgs) {
    this.client = client;
    this.storageKey = storageKey;
  }

  async get(key: string): Promise<Entity | null> {
    const serialized = await this.client.hgetField(this.storageKey, key);

    if (serialized === null) {
      return null;
    }

    return this.parseValue(serialized);
  }

  async set(key: string, value: Entity): Promise<void> {
    await this.client.hsetFields(this.storageKey, {
      [key]: this.serializeValue(value),
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.hdeleteFields(this.storageKey, key);
  }

  async size(): Promise<number> {
    return this.client.hlen(this.storageKey);
  }

  async getAll(): Promise<Map<string, Entity>> {
    const serializedItems = await this.client.hgetAll(this.storageKey);
    const entries = new Map<string, Entity>();

    for (const [key, serialized] of Object.entries(serializedItems)) {
      const value = this.parseValue(serialized);

      if (value !== null) {
        entries.set(key, value);
      }
    }

    return entries;
  }

  async setAll(data: Map<string, Entity>): Promise<void> {
    if (!data.size) {
      await this.client.deleteKey(this.storageKey);
      return;
    }

    const serializedItems: Record<string, string> = {};

    for (const [key, value] of data) {
      serializedItems[key] = this.serializeValue(value);
    }

    await this.client.replaceHash(this.storageKey, serializedItems);
  }

  async ping(key: string): Promise<boolean> {
    return (await this.client.hgetField(this.storageKey, key)) !== null;
  }

  private parseValue(serialized: string): Entity | null {
    try {
      return JSON.parse(serialized) as Entity;
    } catch {
      return null;
    }
  }

  private serializeValue(value: Entity): string {
    const serialized = JSON.stringify(value);

    if (typeof serialized !== 'string') {
      throw new Error('Redis cache value must be JSON serializable');
    }

    return serialized;
  }
}
