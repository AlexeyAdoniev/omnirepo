import {describe, expect, it} from 'vitest';

import {RepositoryBuilder} from '../../src/repository/builder.js';
import {InMemoryMapCache} from '../../src/stores/InMemoryMapCache.js';
import {InMemoryStorage} from '../../src/stores/InMemoryStorage.js';

interface Entity {
  _id: string;
}

describe('RepositoryBuilder', () => {
  it('throws when the fallback policy has no fallback cache', () => {
    const builder = new RepositoryBuilder<Entity>()
      .setStorage(new InMemoryStorage<Entity>())
      .setCache(new InMemoryMapCache<Entity>())
      .setDegradationPolicy('fallback');

    expect(() => builder.build()).toThrow(
      'Fallback cache is required for fallback degradation policy',
    );
  });
});
