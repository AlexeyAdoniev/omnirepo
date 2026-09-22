import {describe, expect, it} from 'vitest';
import {chain} from '../../src/helpers.js';

describe('chain', () => {
  it('maps an async value and preserves it after an async effect', async () => {
    const observed: string[] = [];

    const result = await chain(Promise.resolve(2))
      .map(value => `value-${value}`)
      .next(async value => `${value}-enriched`)
      .execute(async value => {
        observed.push(value);
      });

    expect(result).toBe('value-2-enriched');
    expect(observed).toEqual(['value-2-enriched']);
  });

  it('recovers from a rejected chain with a fallback value', async () => {
    const error = new Error('Load failed');

    const result = await chain(Promise.resolve<number>(2))
       .map(() => {
        throw error;
       })
      .catch(caughtError => {
        expect(caughtError).toBe(error);
        return 0;
      })
      .execute(() => undefined);

    expect(result).toBe(0);
  });

  it('propagates a rethrown error to the upper level', async () => {
    const originalError = new Error('Load failed');
    const rethrownError = new Error('Could not recover');
    let caughtError: unknown;
    let wasExecuted = false;

    try {
      await chain(Promise.reject<number>(originalError))
        .catch(error => {
          expect(error).toBe(originalError);
          throw rethrownError;
        })
        .execute(() => {
          wasExecuted = true;
        });
    } catch (error) {
      caughtError = error;
    }

    expect(caughtError).toBe(rethrownError);
    expect(wasExecuted).toBe(false);
  });
});
