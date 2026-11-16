import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndex,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261116120000-create-processed-events-collection.js';

const INDEXES = [
  ['processed_events_processedAt_ttl', { processedAt: 1 }, false, 1209600]
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

  return { db, stored, createCollection, createIndex, dropIndex, drop };
};

describe('create processed events collection migration', () => {
  describe('up', () => {
    it('creates the processed_events collection when missing', async () => {
      const { db, createCollection } = buildDb([], { exists: false });

      await up(db);

      expect(createCollection).toHaveBeenCalledWith('processed_events');
    });

    it('ignores namespace exists error on create collection and creates index', async () => {
      const { db, createIndex } = buildDb([], {
        exists: false,
        createCollectionError: NAMESPACE_EXISTS
      });

      await up(db);

      expect(createIndex).toHaveBeenCalledTimes(1);
    });

    it('is idempotent when applied consecutively', async () => {
      const { db, createIndex } = buildDb([], { exists: false });

      await up(db);
      await up(db);

      expect(createIndex).toHaveBeenCalledTimes(1);
    });

    it('rethrows unexpected create collection error', async () => {
      const { db } = buildDb([], {
        exists: false,
        createCollectionError: UNAUTHORIZED
      });

      await expect(up(db)).rejects.toThrow(UNAUTHORIZED);
    });

    it.each(INDEXES)(
      'creates index %s when it does not exist',
      async (name, key, unique, expireAfterSeconds) => {
        const { db, createIndex } = buildDb([], { exists: false });

        await up(db);

        expect(createIndex).toHaveBeenCalledTimes(1);
        expect(createIndex).toHaveBeenCalledWith(key, {
          name,
          expireAfterSeconds
        });
      }
    );

    it.each(INDEXES)(
      'leaves index %s untouched when definition matches',
      async (name, key, unique, expireAfterSeconds) => {
        const initial: MigrationIndex = {
          name,
          key,
          ...(unique ? { unique: true } : {}),
          expireAfterSeconds
        };
        const { db, createIndex } = buildDb([initial]);

        await up(db);

        expect(createIndex).not.toHaveBeenCalled();
      }
    );

    it.each(INDEXES)(
      'recreates index %s when key differs',
      async (name, key, unique, expireAfterSeconds) => {
        const initial: MigrationIndex = {
          name,
          key: { other: 1 },
          ...(unique ? { unique: true } : {}),
          expireAfterSeconds
        };
        const { db, createIndex, dropIndex } = buildDb([initial]);

        await up(db);

        expect(dropIndex).toHaveBeenCalledWith(name);
        expect(createIndex).toHaveBeenCalledWith(key, {
          name,
          expireAfterSeconds
        });
      }
    );

    it.each(INDEXES)(
      'recreates index %s when expireAfterSeconds differs',
      async (name, key, unique, expireAfterSeconds) => {
        const initial: MigrationIndex = {
          name,
          key,
          ...(unique ? { unique: true } : {}),
          expireAfterSeconds: expireAfterSeconds + 100
        };
        const { db, createIndex, dropIndex } = buildDb([initial]);

        await up(db);

        expect(dropIndex).toHaveBeenCalledWith(name);
        expect(createIndex).toHaveBeenCalledWith(key, {
          name,
          expireAfterSeconds
        });
      }
    );
  });

  describe('down', () => {
    it.each(INDEXES)(
      'drops index %s when present',
      async (name, key, unique, expireAfterSeconds) => {
        const initial: MigrationIndex = {
          name,
          key,
          ...(unique ? { unique: true } : {}),
          expireAfterSeconds
        };
        const { db, dropIndex } = buildDb([initial]);

        await down(db);

        expect(dropIndex).toHaveBeenCalledWith(name);
      }
    );

    it('drops collection when present', async () => {
      const { db, drop } = buildDb();

      await down(db);

      expect(drop).toHaveBeenCalled();
    });

    it('completes cleanly when the collection and index are already absent', async () => {
      const { db } = buildDb([], { exists: false });

      await expect(down(db)).resolves.not.toThrow();
    });

    it('rethrows unexpected collection drop error', async () => {
      const { db, drop } = buildDb();
      drop.mockReturnValueOnce(Promise.reject(UNAUTHORIZED));

      await expect(down(db)).rejects.toThrow(UNAUTHORIZED);
    });
  });
});
