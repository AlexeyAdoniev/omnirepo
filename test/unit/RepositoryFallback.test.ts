import {Types} from 'mongoose';
import {describe, expect, it, vi} from 'vitest';
import {RepositoryBuilder} from '../../src/repository/builder.js';
import {InMemoryCache} from '../../src/stores/InMemoryCache.js';
import {InMemoryStorage} from '../../src/stores/InMemoryStorage.js';


interface User {
  _id: Types.ObjectId;
  name: string;
}

class BrokenInMemoryCache<Entity> extends InMemoryCache<Entity> {
  override async get(): Promise<Entity | null> {
    throw new Error('Cache is broken');
  }
}

describe('Repository fallback cache', () => {
  it('uses storage after a cache failure, then uses the fallback cache', async () => {
    const id = new Types.ObjectId();
    const storedUser: User = {_id: id, name: 'alex'};
    const cachedUser: User = {_id: id, name: 'alex2'};
    const fallbackCache = new InMemoryCache<User>(
      new Map([[String(id), cachedUser]]),
    );
    const repository = new RepositoryBuilder<User>()
      .setStorage(new InMemoryStorage([storedUser]))
      .setCache(new BrokenInMemoryCache())
      .setDegradationPolicy('fallback')
      .setFallbackCache(fallbackCache)
      .build();

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const firstResult = await repository.findById(String(id));
    const secondResult = await repository.findById(String(id));

    expect(firstResult).toEqual(storedUser);
    expect(secondResult).toEqual(storedUser);
    expect(consoleError).toHaveBeenCalledOnce();
  }, 10_000);
});
