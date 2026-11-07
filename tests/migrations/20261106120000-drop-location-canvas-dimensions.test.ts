import {
  type MigrationCollection,
  type MigrationDb,
  up
} from '../../migrations/scripts/20261106120000-drop-location-canvas-dimensions.js';

type FakeCollection = {
  updateMany: jest.Mock;
};

const buildDb = () => {
  const locations: FakeCollection = {
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 })
  };

  const collection = jest.fn((name: string): MigrationCollection => {
    if (name === 'locations') return locations;
    throw new Error(`Unexpected collection ${name}`);
  });

  const db: MigrationDb = { collection };

  return { db, locations, collection };
};

describe('drop location canvas dimensions migration', () => {
  describe('up', () => {
    it('unsets legacy canvas dimensions from locations collection', async () => {
      const { db, locations, collection } = buildDb();

      await up(db);

      expect(collection).toHaveBeenCalledWith('locations');
      expect(locations.updateMany).toHaveBeenCalledWith(
        {},
        {
          $unset: {
            canvasWidth: '',
            canvasHeight: ''
          }
        }
      );
    });
  });
});
