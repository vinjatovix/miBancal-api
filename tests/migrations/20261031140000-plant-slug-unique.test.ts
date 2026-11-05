import type { MigrationDb } from '../../migrations/scripts/20261031140000-plant-slug-unique.js';
import {
  down,
  up
} from '../../migrations/scripts/20261031140000-plant-slug-unique.js';

const buildFakeDb = () => {
  const createIndex = jest.fn<Promise<string>, [unknown, unknown]>(() =>
    Promise.resolve('plants_slug_unique')
  );
  const dropIndex = jest.fn<Promise<unknown>, [string]>(() =>
    Promise.resolve()
  );
  const collection = { createIndex, dropIndex };
  const db: MigrationDb = { collection: () => collection };

  return { db, createIndex, dropIndex };
};

describe('plant-slug-unique migration', () => {
  describe('up', () => {
    it('creates a unique index on slug', async () => {
      const { db, createIndex } = buildFakeDb();

      await up(db);

      expect(createIndex).toHaveBeenCalledWith(
        { slug: 1 },
        { name: 'plants_slug_unique', unique: true }
      );
    });

    it('rethrows a creation failure naming the collection and the index', async () => {
      const { db, createIndex } = buildFakeDb();
      createIndex.mockRejectedValueOnce(new Error('E11000 duplicate key'));

      await expect(up(db)).rejects.toThrow(
        /plants_slug_unique on plants: E11000 duplicate key/
      );
    });
  });

  describe('down', () => {
    it('drops the plants_slug_unique index', async () => {
      const { db, dropIndex } = buildFakeDb();

      await down(db);

      expect(dropIndex).toHaveBeenCalledWith('plants_slug_unique');
    });

    it('ignores a missing index', async () => {
      const { db, dropIndex } = buildFakeDb();
      dropIndex.mockRejectedValueOnce(
        Object.assign(new Error('index not found'), { code: 27 })
      );

      await expect(down(db)).resolves.not.toThrow();
    });
  });
});
