// Creates the `locations` collection and its indexes: owner listing /
// `findOwnedActiveById` / `findByUserId` via `{ userId, status }`, and a
// partial unique active-name index per owner under the `es`/strength-1
// collation (case/accent-insensitive), mirroring the Plant/GardenInput
// uniqueness pattern. DDL only — no seed data, no backfill. `up` can run more
// than once: `createIndex` with the same definition is a no-op.

const LOCATIONS = 'locations';
const OWNER_STATUS_INDEX = 'locations_userId_status';
const OWNER_NAME_UNIQUE_INDEX = 'locations_userId_name_unique';
const NAME_COLLATION = { locale: 'es', strength: 1 };

const INDEX_NOT_FOUND = 27;
const NAMESPACE_NOT_FOUND = 26;

const dropIndexIfExists = async (collection, name) => {
  try {
    await collection.dropIndex(name);
  } catch (error) {
    if (error?.code !== INDEX_NOT_FOUND && error?.code !== NAMESPACE_NOT_FOUND)
      throw error;
  }
};

export const up = async (db) => {
  const collection = db.collection(LOCATIONS);

  try {
    await collection.createIndex(
      { userId: 1, status: 1 },
      { name: OWNER_STATUS_INDEX }
    );

    await collection.createIndex(
      { userId: 1, name: 1 },
      {
        name: OWNER_NAME_UNIQUE_INDEX,
        unique: true,
        partialFilterExpression: { status: 'active' },
        collation: NAME_COLLATION
      }
    );
  } catch (error) {
    throw new Error(
      `Cannot create indexes on ${LOCATIONS}: ${error?.message}`,
      { cause: error }
    );
  }
};

export const down = async (db) => {
  const collection = db.collection(LOCATIONS);

  await dropIndexIfExists(collection, OWNER_NAME_UNIQUE_INDEX);
  await dropIndexIfExists(collection, OWNER_STATUS_INDEX);
};
