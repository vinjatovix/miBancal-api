import {
  down,
  type MigrationCollection,
  type MigrationDb,
  up
} from '../../migrations/scripts/20261114130000-create-outbox-progress-collection.js';

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

const NAMESPACE_NOT_FOUND = mongoError(26);
const NAMESPACE_EXISTS = mongoError(48);
const UNAUTHORIZED = mongoError(13);

const buildDb = ({
  exists = true,
  createCollectionError
}: {
  exists?: boolean;
  createCollectionError?: Error;
} = {}) => {
  let collectionExists = exists;

  const createIndex = jest.fn();

  const drop = jest.fn((): Promise<boolean> => {
    if (!collectionExists) {
      return Promise.reject(NAMESPACE_NOT_FOUND);
    }
    collectionExists = false;
    return Promise.resolve(true);
  });

  const collection: MigrationCollection & { createIndex: jest.Mock } = {
    createIndex,
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

  return { db, createCollection, createIndex, drop };
};

describe('create outbox_progress collection migration', () => {
  describe('up', () => {
    it('creates the outbox_progress collection when missing', async () => {
      const { db, createCollection } = buildDb({ exists: false });

      await up(db);

      expect(createCollection).toHaveBeenCalledWith('outbox_progress');
    });

    it('declares no index beyond the default _id', async () => {
      const { db, createIndex } = buildDb({ exists: false });

      await up(db);

      expect(createIndex).not.toHaveBeenCalled();
    });

    it('ignores a namespace-exists error on create collection', async () => {
      const { db } = buildDb({
        exists: false,
        createCollectionError: NAMESPACE_EXISTS
      });

      await expect(up(db)).resolves.not.toThrow();
    });

    it('is idempotent when applied consecutively', async () => {
      const { db, createIndex } = buildDb({ exists: false });

      await up(db);
      await up(db);

      expect(createIndex).not.toHaveBeenCalled();
    });

    it('rethrows an unexpected create collection error', async () => {
      const { db } = buildDb({
        exists: false,
        createCollectionError: UNAUTHORIZED
      });

      await expect(up(db)).rejects.toThrow(UNAUTHORIZED);
    });
  });

  describe('down', () => {
    it('drops the collection when present', async () => {
      const { db, drop } = buildDb();

      await down(db);

      expect(drop).toHaveBeenCalled();
    });

    it('completes cleanly when the collection is already absent', async () => {
      const { db } = buildDb({ exists: false });

      await expect(down(db)).resolves.not.toThrow();
    });

    it('rethrows an unexpected collection drop error', async () => {
      const { db, drop } = buildDb();
      drop.mockReturnValueOnce(Promise.reject(UNAUTHORIZED));

      await expect(down(db)).rejects.toThrow(UNAUTHORIZED);
    });
  });
});
