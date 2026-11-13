import {
  down,
  type MigrationCollection,
  type MigrationDb,
  type MigrationIndexOptions,
  up
} from '../../migrations/scripts/20261102000000-create-locations-collection.js';

const OWNER_STATUS_INDEX = 'locations_userId_status';
const OWNER_NAME_UNIQUE_INDEX = 'locations_userId_name_unique';

const mongoError = (code: number): Error =>
  Object.assign(new Error(`mongo error ${code}`), { code });

type FakeCollection = {
  createIndex: jest.Mock<
    Promise<string>,
    [Record<string, number>, MigrationIndexOptions]
  >;
  dropIndex: jest.Mock<Promise<unknown>, [string]>;
};

const buildDb = () => {
  const stored = new Map<string, MigrationIndexOptions>();
  const locations: FakeCollection = {
    createIndex: jest.fn((_key, options) => {
      stored.set(options.name, options);
      return Promise.resolve(options.name);
    }),
    dropIndex: jest.fn((name: string) =>
      stored.delete(name) ? Promise.resolve() : Promise.reject(mongoError(27))
    )
  };
  const collection = jest.fn((): MigrationCollection => locations);
  const db: MigrationDb = { collection };

  return { db, locations, collection, stored };
};

describe('create locations collection migration', () => {
  describe('up', () => {
    it('creates owner status listing index', async () => {
      const { db, locations, collection } = buildDb();

      await up(db);

      expect(collection).toHaveBeenCalledWith('locations');
      expect(locations.createIndex).toHaveBeenCalledWith(
        { userId: 1, status: 1 },
        { name: OWNER_STATUS_INDEX }
      );
    });

    it('creates owner active name unique index with collation', async () => {
      const { db, locations } = buildDb();

      await up(db);

      expect(locations.createIndex).toHaveBeenCalledWith(
        { userId: 1, name: 1 },
        {
          name: OWNER_NAME_UNIQUE_INDEX,
          unique: true,
          partialFilterExpression: { status: 'active' },
          collation: { locale: 'es', strength: 1 }
        }
      );
    });

    it('is idempotent when executed multiple times', async () => {
      const { db, stored } = buildDb();

      await up(db);
      await up(db);

      expect([...stored.keys()]).toEqual([
        OWNER_STATUS_INDEX,
        OWNER_NAME_UNIQUE_INDEX
      ]);
    });

    it('wraps and propagates unexpected errors with cause', async () => {
      const { db, locations } = buildDb();
      const failure = mongoError(11000);
      locations.createIndex.mockRejectedValue(failure);

      const execution = up(db);

      await expect(execution).rejects.toThrow(
        /Cannot create indexes on locations/
      );
      await expect(execution).rejects.toMatchObject({ cause: failure });
    });
  });

  describe('down', () => {
    it('drops both created indexes', async () => {
      const { db, stored, locations } = buildDb();
      await up(db);

      await down(db);

      expect(locations.dropIndex).toHaveBeenCalledWith(OWNER_NAME_UNIQUE_INDEX);
      expect(locations.dropIndex).toHaveBeenCalledWith(OWNER_STATUS_INDEX);
      expect(stored.size).toBe(0);
    });

    it.each([26, 27])(
      'ignores error code %i when dropping missing index or collection',
      async (code) => {
        const { db, locations } = buildDb();
        locations.dropIndex.mockRejectedValue(mongoError(code));

        const execution = down(db);

        await expect(execution).resolves.toBeUndefined();
      }
    );

    it('rethrows unexpected drop errors', async () => {
      const { db, locations } = buildDb();
      locations.dropIndex.mockRejectedValue(mongoError(13));

      const execution = down(db);

      await expect(execution).rejects.toMatchObject({ code: 13 });
    });
  });
});
