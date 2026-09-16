import {describe, expect, it, vi} from 'vitest';
import {RepositoryBuilder} from '../../src/repository/builder.js';
import {InMemoryMapCache} from '../../src/stores/InMemoryMapCache.js';
import {InMemoryStorage} from '../../src/stores/InMemoryStorage.js';

interface Entity {
  _id: number;
  name: string;
}

class NormalizingStorage extends InMemoryStorage<Entity> {
  override async insert(entity: Entity): Promise<Entity> {
    const inserted = {...entity, name: entity.name.toUpperCase()};
    return super.insert(inserted);
  }
}

describe('Repository', () => {
  it('caches the entity returned by storage after an insert', async () => {
    const cache = new InMemoryMapCache<Entity>();
    const repository = new RepositoryBuilder<Entity>()
      .setStorage(new NormalizingStorage())
      .setCache(cache)
      .build();

    const inserted = await repository.insert({_id: 0, name: 'alex'});

    expect(inserted).toEqual({_id: 0, name: 'ALEX'});
    await expect(cache.get('0')).resolves.toEqual(inserted);
  });

  it('allows an empty repository when the maximum entity count is zero', async () => {
    const repository = new RepositoryBuilder<Entity>()
      .setStorage(new InMemoryStorage<Entity>())
      .setCache(new InMemoryMapCache<Entity>())
      .setMaximumEntityCount(0)
      .build();

    await expect(repository.all()).resolves.toEqual(new Map());
  });

  it('warms the cache after increasing the maximum entity count', async () => {
    const entities = Array.from({length: 11}, (_, _id) => ({
      _id,
      name: `entity-${_id}`,
    }));
    const storage = new InMemoryStorage<Entity>(entities);
    const cache = new InMemoryMapCache<Entity>();
    const builder = new RepositoryBuilder<Entity>()
      .setStorage(storage)
      .setCache(cache);

    await expect(builder.build().warmUpCache()).rejects.toThrow(
      'Cache warm-up failed: Maximum entity count is not defined',
    );

    builder.setMaximumEntityCount(10);

    await expect(builder.build().warmUpCache()).rejects.toThrow(
      'Cache warm-up failed: Entity count exceeds maximum',
    );

    const repository = builder.setMaximumEntityCount(11).build();
    await repository.warmUpCache();

    const find = vi.spyOn(storage, 'find');
    const count = vi.spyOn(storage, 'count');

    await expect(repository.all()).resolves.toEqual(
      new Map(entities.map(entity => [String(entity._id), entity])),
    );
    expect(find).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
