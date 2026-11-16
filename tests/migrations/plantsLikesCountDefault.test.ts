import {
  down,
  type MigrationDb,
  up
} from '../../migrations/scripts/20261023140000-plants-likes-count-default.js';

type RecordedCall = {
  collection: string;
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
};

const fakeDb = (failing?: {
  collection: string;
  error: Error;
}): { db: MigrationDb; calls: RecordedCall[] } => {
  const calls: RecordedCall[] = [];
  const db: MigrationDb = {
    collection: (collection: string) => ({
      updateMany: (
        filter: Record<string, unknown>,
        update: Record<string, unknown>
      ) => {
        calls.push({ collection, filter, update });
        return failing?.collection === collection
          ? Promise.reject(failing.error)
          : Promise.resolve({ matchedCount: 0, modifiedCount: 0 });
      }
    })
  };
  return { db, calls };
};

describe('plants-likes-count-default migration', () => {
  describe('up', () => {
    it('sets likesCount to 0 where the field does not exist on plants', async () => {
      const { db, calls } = fakeDb();

      await up(db);

      expect(calls).toEqual([
        {
          collection: 'plants',
          filter: { likesCount: { $exists: false } },
          update: { $set: { likesCount: 0 } }
        }
      ]);
    });

    it('propagates the error when updateMany fails during up', async () => {
      const error = new Error('database write failure');
      const { db } = fakeDb({ collection: 'plants', error });

      const action = up(db);

      await expect(action).rejects.toThrow(error);
    });
  });

  describe('down', () => {
    it('unsets likesCount from all plant documents', async () => {
      const { db, calls } = fakeDb();

      await down(db);

      expect(calls).toEqual([
        {
          collection: 'plants',
          filter: {},
          update: { $unset: { likesCount: '' } }
        }
      ]);
    });

    it('propagates the error when updateMany fails during down', async () => {
      const error = new Error('database write failure');
      const { db } = fakeDb({ collection: 'plants', error });

      const action = down(db);

      await expect(action).rejects.toThrow(error);
    });
  });
});
