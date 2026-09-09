import {describe, expect, it} from 'vitest';

import {RepositoryBuilder} from '../../src/repository/builder.js';
import {InMemoryCache} from '../../src/stores/InMemoryCache.js';
import {InMemoryStorage} from '../../src/stores/InMemoryStorage.js';

interface Entity {
  _id: string;
}

describe('RepositoryBuilder', () => {
  it('throws when the fallback policy has no fallback cache', () => {
    const builder = new RepositoryBuilder<Entity>()
      .setStorage(new InMemoryStorage())
      .setCache(new InMemoryCache())
      .setDegradationPolicy('fallback');

    expect(() => builder.build()).toThrow(
      'Fallback cache is required for fallback degradation policy',
    );
  });
});
