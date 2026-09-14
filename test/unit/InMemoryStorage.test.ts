import {describe, expect, it} from 'vitest';
import {InMemoryStorage} from '../../src/stores/InMemoryStorage.js';

interface Entity {
  _id: string;
  name: string;
}

describe('InMemoryStorage', () => {
  it('returns the updated entity', async () => {
    const storage = new InMemoryStorage<Entity>([
      {_id: '1', name: 'before'},
    ]);

    await expect(storage.updateById('1', {name: 'after'})).resolves.toEqual({
      _id: '1',
      name: 'after',
    });
  });

  it('returns null when updating a missing entity', async () => {
    const storage = new InMemoryStorage<Entity>();

    await expect(storage.updateById('missing', {name: 'after'})).resolves.toBeNull();
  });

  it('returns the inserted entity', async () => {
    const storage = new InMemoryStorage<Entity>();
    const entity = {_id: '1', name: 'inserted'};

    await expect(storage.insert(entity)).resolves.toBe(entity);
    await expect(storage.findById('1')).resolves.toBe(entity);
  });

  it('returns the deleted entity', async () => {
    const entity = {_id: '1', name: 'deleted'};
    const storage = new InMemoryStorage<Entity>([entity]);

    await expect(storage.deleteById('1')).resolves.toBe(entity);
    await expect(storage.findById('1')).resolves.toBeNull();
  });

  it('returns null when deleting a missing entity', async () => {
    const storage = new InMemoryStorage<Entity>();

    await expect(storage.deleteById('missing')).resolves.toBeNull();
  });
});
