import {describe, expect, it} from 'vitest';
import {
  RedisHashCache,
  type RedisHashCacheClient,
} from '../../src/stores/RedisHashCache.js';

interface User {
  _id: string;
  name: string;
}

class FakeRedisHashCacheClient implements RedisHashCacheClient {
  private readonly hashes = new Map<string, Map<string, string>>();

  async hgetField(key: string, field: string): Promise<string | null> {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  async hgetAll(key: string): Promise<Record<string, string>> {
    return Object.fromEntries(this.hashes.get(key) ?? []);
  }

  async hsetFields(key: string, data: Record<string, string>): Promise<void> {
    const hash = this.getHash(key);

    for (const [field, value] of Object.entries(data)) {
      hash.set(field, value);
    }
  }

  async hdeleteFields(key: string, ...fields: string[]): Promise<void> {
    const hash = this.hashes.get(key);

    if (!hash) {
      return;
    }

    for (const field of fields) {
      hash.delete(field);
    }
  }

  async hlen(key: string): Promise<number> {
    return this.hashes.get(key)?.size ?? 0;
  }

  async replaceHash(key: string, data: Record<string, string>): Promise<void> {
    this.hashes.set(key, new Map(Object.entries(data)));
  }

  async deleteKey(key: string): Promise<number> {
    return this.hashes.delete(key) ? 1 : 0;
  }

  async writeRaw(key: string, field: string, value: string): Promise<void> {
    this.getHash(key).set(field, value);
  }

  private getHash(key: string): Map<string, string> {
    const existingHash = this.hashes.get(key);

    if (existingHash) {
      return existingHash;
    }

    const hash = new Map<string, string>();
    this.hashes.set(key, hash);
    return hash;
  }
}

describe('RedisHashCache', () => {
  it('stores and retrieves JSON serialized values', async () => {
    const cache = new RedisHashCache<User>({
      client: new FakeRedisHashCacheClient(),
      storageKey: 'users',
    });
    const user = {_id: '1', name: 'alex'};

    await cache.set('1', user);

    await expect(cache.get('1')).resolves.toEqual(user);
    await expect(cache.size()).resolves.toBe(1);
    await expect(cache.ping('1')).resolves.toBe(true);
    await expect(cache.ping('missing')).resolves.toBe(false);
  });

  it('returns all valid cached values', async () => {
    const client = new FakeRedisHashCacheClient();
    const cache = new RedisHashCache<User>({client, storageKey: 'users'});
    const users = new Map<string, User>([
      ['1', {_id: '1', name: 'alex'}],
      ['2', {_id: '2', name: 'sam'}],
    ]);

    await cache.setAll(users);
    await client.writeRaw('users', 'broken', '{');

    await expect(cache.getAll()).resolves.toEqual(users);
  });

  it('replaces all values and clears the hash when setAll receives an empty map', async () => {
    const cache = new RedisHashCache<User>({
      client: new FakeRedisHashCacheClient(),
      storageKey: 'users',
    });

    await cache.setAll(new Map([
      ['1', {_id: '1', name: 'alex'}],
      ['2', {_id: '2', name: 'sam'}],
    ]));
    await cache.setAll(new Map([
      ['3', {_id: '3', name: 'lee'}],
    ]));

    await expect(cache.getAll()).resolves.toEqual(new Map([
      ['3', {_id: '3', name: 'lee'}],
    ]));

    await cache.setAll(new Map());

    await expect(cache.size()).resolves.toBe(0);
  });

  it('deletes cached values', async () => {
    const cache = new RedisHashCache<User>({
      client: new FakeRedisHashCacheClient(),
      storageKey: 'users',
    });

    await cache.set('1', {_id: '1', name: 'alex'});
    await cache.delete('1');

    await expect(cache.get('1')).resolves.toBeNull();
  });
});
