import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndex,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261026120000-create-garden-inputs-collection.js';

const INDEXES = [
  ['garden_inputs_slug_unique', { slug: 1 }, true],
  ['garden_inputs_category', { category: 1 }, false]
] as const;

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
  }: {
    exists?: boolean;
    createCollectionError?: Error;
  } = {}
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

  return {
    db,
    stored,
    createCollection,
    createIndex,
    dropIndex,
    drop
  };
};

describe('create gardenInputs collection migration', () => {
  describe('up', () => {
    it.each(INDEXES)(
      'creates index %s when it does not exist',
      async (name, key, unique) => {
        const { db, createIndex } = buildDb();

        await up(db);

        expect(createIndex).toHaveBeenCalledWith(
          key,
          unique ? { name, unique: true } : { name }
        );
      }
    );

    it.each(INDEXES)(
      'leaves index %s untouched when definition matches',
      async (name, key, unique) => {
        const initial: MigrationIndex = {
          name,
          key,
          ...(unique && { unique: true })
        };
        const { db, createIndex } = buildDb([initial]);

        await up(db);

        expect(createIndex).not.toHaveBeenCalledWith(key, expect.anything());
      }
    );

    it('creates gardenInputs collection when missing', async () => {
      const { db, createCollection } = buildDb([], { exists: false });

      await up(db);

      expect(createCollection).toHaveBeenCalledWith('gardenInputs');
    });

    it('ignores NAMESPACE_EXISTS (code 48) on createCollection', async () => {
      const { db, createCollection } = buildDb([], { exists: true });

      await up(db);

      expect(createCollection).toHaveBeenCalledWith('gardenInputs');
    });

    it('throws if createCollection fails with unexpected error', async () => {
      const { db } = buildDb([], { createCollectionError: UNAUTHORIZED });

      await expect(up(db)).rejects.toThrow(UNAUTHORIZED);
    });

    it('reconciles index if existing index definition differs', async () => {
      const oldIndex: MigrationIndex = {
        name: 'garden_inputs_slug_unique',
        key: { slug: -1 },
        unique: false
      };
      const { db, stored, dropIndex } = buildDb([oldIndex]);

      await up(db);

      expect(dropIndex).toHaveBeenCalledWith('garden_inputs_slug_unique');
      expect(stored.get('garden_inputs_slug_unique')).toEqual({
        name: 'garden_inputs_slug_unique',
        key: { slug: 1 },
        unique: true
      });
    });
  });

  describe('down', () => {
    it.each(INDEXES)('drops index %s', async (name) => {
      const { db, dropIndex } = buildDb([
        { name, key: { slug: 1 }, unique: true }
      ]);

      await down(db);

      expect(dropIndex).toHaveBeenCalledWith(name);
    });

    it('drops gardenInputs collection', async () => {
      const { db, drop } = buildDb();

      await down(db);

      expect(drop).toHaveBeenCalled();
    });

    it('ignores NAMESPACE_NOT_FOUND (code 26) on collection.drop', async () => {
      const { db } = buildDb([], { exists: false });

      await expect(down(db)).resolves.not.toThrow();
    });
  });
});
