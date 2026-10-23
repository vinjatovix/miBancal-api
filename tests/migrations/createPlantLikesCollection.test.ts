import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndex,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261023130000-create-plant-likes-collection.js';

const UNIQUE_INDEX_NAME = 'plant_likes_user_plant_unique';
const UNIQUE_INDEX_KEY = { userId: 1, plantId: 1 };
const PLANT_INDEX_NAME = 'plant_likes_plant_idx';
const PLANT_INDEX_KEY = { plantId: 1 };

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

const NAMESPACE_NOT_FOUND = mongoError(26);
const INDEX_NOT_FOUND = mongoError(27);
const NAMESPACE_EXISTS = mongoError(48);
const UNAUTHORIZED = mongoError(13);

const buildDb = (
  initialIndexes: MigrationIndex[] = [],
  {
    exists = true,
    createCollectionError
  }: { exists?: boolean; createCollectionError?: Error } = {}
) => {
  const stored = new Map(initialIndexes.map((idx) => [idx.name, idx]));
  let collectionExists = exists;

  const indexes = jest.fn((): Promise<MigrationIndex[]> =>
    collectionExists
      ? Promise.resolve([...stored.values()])
      : Promise.reject(NAMESPACE_NOT_FOUND)
  );

  const createIndex = jest.fn(
    (
      key: Record<string, number>,
      options: MigrationIndexOptions
    ): Promise<string> => {
      collectionExists = true;
      stored.set(options.name, { key, ...options });
      return Promise.resolve(options.name);
    }
  );

  const dropIndex = jest.fn((name: string): Promise<unknown> =>
    stored.delete(name) ? Promise.resolve() : Promise.reject(INDEX_NOT_FOUND)
  );

  const drop = jest.fn((): Promise<boolean> => {
    if (!collectionExists) {
      return Promise.reject(NAMESPACE_NOT_FOUND);
    }
    collectionExists = false;
    stored.clear();
    return Promise.resolve(true);
  });

  const collection: MigrationCollection = {
    indexes,
    createIndex,
    dropIndex,
    drop
  };

  const createCollection = jest.fn((_name: string): Promise<unknown> => {
    if (createCollectionError) return Promise.reject(createCollectionError);
    if (collectionExists) return Promise.reject(NAMESPACE_EXISTS);
    collectionExists = true;
    return Promise.resolve();
  });

  const db: MigrationDb = {
    collection: () => collection,
    createCollection
  };

  return { db, stored, createCollection, createIndex, dropIndex, drop };
};

describe('create plant_likes collection migration', () => {
  describe('up', () => {
    it('creates the unique compound index and the secondary plant index', async () => {
      const { db, stored } = buildDb();

      await up(db);

      expect(stored.get(UNIQUE_INDEX_NAME)).toEqual({
        name: UNIQUE_INDEX_NAME,
        key: UNIQUE_INDEX_KEY,
        unique: true
      });
      expect(stored.get(PLANT_INDEX_NAME)).toEqual({
        name: PLANT_INDEX_NAME,
        key: PLANT_INDEX_KEY
      });
    });

    it('creates the collection if it did not exist', async () => {
      const { db, createCollection } = buildDb([], { exists: false });

      await up(db);

      expect(createCollection).toHaveBeenCalledWith('plant_likes');
    });

    it('propagates a collection creation error other than already exists', async () => {
      const { db } = buildDb([], {
        exists: false,
        createCollectionError: UNAUTHORIZED
      });

      await expect(up(db)).rejects.toBe(UNAUTHORIZED);
    });

    it('rebuilds the compound index when it exists but is not unique', async () => {
      const { db, stored, createIndex, dropIndex } = buildDb([
        { name: UNIQUE_INDEX_NAME, key: UNIQUE_INDEX_KEY }
      ]);

      await up(db);

      expect(dropIndex).toHaveBeenCalledWith(UNIQUE_INDEX_NAME);
      expect(createIndex).toHaveBeenCalledWith(UNIQUE_INDEX_KEY, {
        name: UNIQUE_INDEX_NAME,
        unique: true
      });
      expect(stored.get(UNIQUE_INDEX_NAME)?.unique).toBe(true);
    });

    it('skips creation when both indexes already match', async () => {
      const { db, createIndex, dropIndex } = buildDb([
        { name: UNIQUE_INDEX_NAME, key: UNIQUE_INDEX_KEY, unique: true },
        { name: PLANT_INDEX_NAME, key: PLANT_INDEX_KEY }
      ]);

      await up(db);

      expect(createIndex).not.toHaveBeenCalled();
      expect(dropIndex).not.toHaveBeenCalled();
    });

    it('is idempotent when run multiple times', async () => {
      const { db, stored } = buildDb();

      await up(db);
      const afterFirstRun = new Map(stored);
      await up(db);

      expect(stored).toEqual(afterFirstRun);
    });
  });

  describe('down', () => {
    it('drops both indexes and the collection', async () => {
      const { db, stored, dropIndex, drop } = buildDb();
      await up(db);

      await down(db);

      expect(dropIndex).toHaveBeenCalledWith(UNIQUE_INDEX_NAME);
      expect(dropIndex).toHaveBeenCalledWith(PLANT_INDEX_NAME);
      expect(drop).toHaveBeenCalled();
      expect(stored.size).toBe(0);
    });

    it('does not fail when the collection does not exist', async () => {
      const { db } = buildDb([], { exists: false });

      await expect(down(db)).resolves.not.toThrow();
    });
  });
});
