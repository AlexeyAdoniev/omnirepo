import {describe, expect, it} from 'vitest';
import {chain} from '../../src/helpers.js';

describe('chain', () => {
  it('maps an async value and preserves it after an async effect', async () => {
    const observed: string[] = [];

    const result = await chain(Promise.resolve(2))
      .aggregate(value => `value-${value}`)
      .next(async value => `${value}-enriched`)
      .tap(async value => {
        observed.push(value);
      });

    expect(result).toBe('value-2-enriched');
    expect(observed).toEqual(['value-2-enriched']);
  });
});
