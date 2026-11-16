import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndex,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261023120000-create-user-bookmarks-collection.js';

const INDEX_NAME = 'user_bookmarks_user_id_unique';
const INDEX_KEY = { userId: 1 };
const INDEX_OPTIONS = { name: INDEX_NAME, unique: true };

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

describe('create user_bookmarks collection migration', () => {
  describe('up', () => {
    it('creates unique index on userId', async () => {
      const { db, stored } = buildDb();

      await up(db);

      expect(stored.get(INDEX_NAME)).toEqual({
        name: INDEX_NAME,
        key: INDEX_KEY,
        unique: true
      });
    });

    it('creates collection if it did not exist', async () => {
      const { db, createCollection } = buildDb([], { exists: false });

      await up(db);

      expect(createCollection).toHaveBeenCalledWith('user_bookmarks');
    });

    it('propagates a collection creation error other than already exists', async () => {
      const { db } = buildDb([], {
        exists: false,
        createCollectionError: UNAUTHORIZED
      });

      await expect(up(db)).rejects.toBe(UNAUTHORIZED);
    });

    it('rebuilds an index that has the expected name but an older key', async () => {
      const { db, stored } = buildDb([
        {
          name: INDEX_NAME,
          key: { userId: -1 }
        }
      ]);

      await up(db);

      expect(stored.get(INDEX_NAME)?.key).toEqual(INDEX_KEY);
    });

    it('skips index creation when index already exists with identical key', async () => {
      const { db, createIndex, dropIndex } = buildDb([
        {
          name: INDEX_NAME,
          key: INDEX_KEY,
          unique: true
        }
      ]);

      await up(db);

      expect(createIndex).not.toHaveBeenCalled();
      expect(dropIndex).not.toHaveBeenCalled();
    });

    it('rebuilds an index that has the expected key but is not unique', async () => {
      const { db, stored, createIndex, dropIndex } = buildDb([
        {
          name: INDEX_NAME,
          key: INDEX_KEY
        }
      ]);

      await up(db);

      expect(dropIndex).toHaveBeenCalledWith(INDEX_NAME);
      expect(createIndex).toHaveBeenCalledWith(INDEX_KEY, INDEX_OPTIONS);
      expect(stored.get(INDEX_NAME)?.unique).toBe(true);
    });

    it('drops index with older key before recreating it', async () => {
      const { db, createIndex, dropIndex } = buildDb([
        {
          name: INDEX_NAME,
          key: { userId: -1 }
        }
      ]);

      await up(db);

      expect(dropIndex).toHaveBeenCalledWith(INDEX_NAME);
      expect(createIndex).toHaveBeenCalledWith(INDEX_KEY, INDEX_OPTIONS);
    });

    it('rejects with error when index creation fails', async () => {
      const { db, createIndex } = buildDb();
      createIndex.mockRejectedValueOnce(UNAUTHORIZED);

      await expect(up(db)).rejects.toBe(UNAUTHORIZED);
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
    it('drops index and collection cleanly', async () => {
      const { db, stored, drop } = buildDb();
      await up(db);

      await down(db);

      expect(drop).toHaveBeenCalled();
      expect(stored.size).toBe(0);
    });

    it('drops index before dropping collection', async () => {
      const { db, dropIndex, drop } = buildDb();
      await up(db);

      await down(db);

      expect(dropIndex).toHaveBeenCalledWith(INDEX_NAME);
      expect(drop.mock.invocationCallOrder[0]).toBeGreaterThan(
        dropIndex.mock.invocationCallOrder[0] ?? 0
      );
    });

    it('propagates error when dropping index fails', async () => {
      const { db, dropIndex } = buildDb();
      await up(db);
      dropIndex.mockRejectedValueOnce(UNAUTHORIZED);

      await expect(down(db)).rejects.toBe(UNAUTHORIZED);
    });

    it('does not fail when collection does not exist', async () => {
      const { db } = buildDb([], { exists: false });

      await expect(down(db)).resolves.not.toThrow();
    });
  });
});
