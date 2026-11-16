import {
  down,
  type MigrationCollection,
  type MigrationDb,
  up
} from '../../../migrations/scripts/20261105120000-bed-location-id-index.js';

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

const NAMESPACE_NOT_FOUND = mongoError(26);
const INDEX_NOT_FOUND = mongoError(27);

type FakeCollection = {
  createIndex: jest.Mock;
  dropIndex: jest.Mock;
};

const buildDb = () => {
  const beds: FakeCollection = {
    createIndex: jest.fn().mockResolvedValue('beds_userId_locationId'),
    dropIndex: jest.fn().mockResolvedValue({})
  };

  const collection = jest.fn((name: string): MigrationCollection => {
    if (name === 'beds') return beds;
    throw new Error(`Unexpected collection ${name}`);
  });

  const db: MigrationDb = { collection };

  return { db, beds, collection };
};

describe('bed location compound index migration', () => {
  describe('up', () => {
    it('creates compound index on userId and locationId with partial filter', async () => {
      const { db, beds, collection } = buildDb();

      await up(db);

      expect(collection).toHaveBeenCalledWith('beds');
      expect(beds.createIndex).toHaveBeenCalledWith(
        { userId: 1, locationId: 1 },
        {
          name: 'beds_userId_locationId',
          partialFilterExpression: { deleted: false }
        }
      );
    });

    it('wraps and rethrows errors when index creation fails', async () => {
      const { db, beds } = buildDb();
      beds.createIndex.mockRejectedValue(new Error('disk full'));

      const execution = up(db);

      await expect(execution).rejects.toThrow(
        'Cannot create index beds_userId_locationId on beds: disk full'
      );
    });
  });

  describe('down', () => {
    it('drops compound index if it exists', async () => {
      const { db, beds, collection } = buildDb();

      await down(db);

      expect(collection).toHaveBeenCalledWith('beds');
      expect(beds.dropIndex).toHaveBeenCalledWith('beds_userId_locationId');
    });

    it('ignores INDEX_NOT_FOUND error on rollback', async () => {
      const { db, beds } = buildDb();
      beds.dropIndex.mockRejectedValue(INDEX_NOT_FOUND);

      const execution = down(db);

      await expect(execution).resolves.toBeUndefined();
    });

    it('ignores NAMESPACE_NOT_FOUND error on rollback', async () => {
      const { db, beds } = buildDb();
      beds.dropIndex.mockRejectedValue(NAMESPACE_NOT_FOUND);

      const execution = down(db);

      await expect(execution).resolves.toBeUndefined();
    });

    it('rethrows unexpected errors on rollback', async () => {
      const { db, beds } = buildDb();
      beds.dropIndex.mockRejectedValue(new Error('connection lost'));

      const execution = down(db);

      await expect(execution).rejects.toThrow('connection lost');
    });
  });
});
