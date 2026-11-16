import {
  down,
  type MigrationCollection,
  type MigrationDb,
  up
} from '../../migrations/scripts/20261102120000-redefine-location-coordinates.js';

type FakeCollection = {
  updateMany: jest.Mock;
};

const buildDb = () => {
  const locations: FakeCollection = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 })
  };
  const beds: FakeCollection = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 })
  };

  const collection = jest.fn((name: string): MigrationCollection => {
    if (name === 'locations') return locations;
    if (name === 'beds') return beds;
    throw new Error(`Unexpected collection ${name}`);
  });

  const db: MigrationDb = { collection };

  return { db, locations, beds, collection };
};

describe('redefine location coordinates migration', () => {
  describe('up', () => {
    it('unsets legacy geographic fields from locations collection', async () => {
      const { db, locations, collection } = buildDb();

      await up(db);

      expect(collection).toHaveBeenCalledWith('locations');
      expect(locations.updateMany).toHaveBeenCalledWith(
        {},
        {
          $unset: {
            postalCode: '',
            country: '',
            timezone: '',
            hemisphere: ''
          }
        }
      );
    });

    it('unsets legacy geographic fields from beds collection', async () => {
      const { db, beds, collection } = buildDb();

      await up(db);

      expect(collection).toHaveBeenCalledWith('beds');
      expect(beds.updateMany).toHaveBeenCalledWith(
        {},
        {
          $unset: {
            postalCode: '',
            country: '',
            timezone: '',
            hemisphere: ''
          }
        }
      );
    });

    it('is idempotent when executed multiple times', async () => {
      const { db, locations, beds } = buildDb();

      await up(db);
      await up(db);

      expect(locations.updateMany).toHaveBeenCalledTimes(2);
      expect(beds.updateMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('down', () => {
    it('resolves cleanly without error as down is irreversible by design', async () => {
      const { db } = buildDb();

      const execution = down(db);

      await expect(execution).resolves.toBeUndefined();
    });
  });
});
