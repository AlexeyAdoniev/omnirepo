import {describe, expect, it} from 'vitest';

import {RepositoryBuilder} from '../../src/repository/builder.js';
import {InMemoryMapCache} from '../../src/stores/InMemoryMapCache.js';
import {InMemoryStorage} from '../../src/stores/InMemoryStorage.js';
import {Repository} from '../../src/repository/Repository.js';

interface Entity {
  _id: string;
}

describe('RepositoryBuilder', () => {
  it('builds a repository subclass', () => {
    class EntityRepository extends Repository<Entity> {
      hasCustomBehavior(): boolean {
        return true;
      }
    }

    const repository = new RepositoryBuilder(EntityRepository)
      .setStorage(new InMemoryStorage<Entity>())
      .setCache(new InMemoryMapCache<Entity>())
      .build();

    expect(repository).toBeInstanceOf(EntityRepository);
    expect(repository.hasCustomBehavior()).toBe(true);
  });

  it('throws when the fallback policy has no fallback cache', () => {
    const builder = new RepositoryBuilder<Entity>(Repository)
      .setStorage(new InMemoryStorage<Entity>())
      .setCache(new InMemoryMapCache<Entity>())
      .setDegradationPolicy('fallback');

    expect(() => builder.build()).toThrow(
      'Fallback cache is required for fallback degradation policy',
    );
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid maximum entity count of %s',
    maximumEntityCount => {
      const builder = new RepositoryBuilder<Entity>(Repository);

      expect(() => builder.setMaximumEntityCount(maximumEntityCount)).toThrow(
        'Maximum entity count must be a non-negative integer',
      );
    },
  );
});
