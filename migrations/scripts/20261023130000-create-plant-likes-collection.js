const COLLECTION_NAME = 'plant_likes';

const INDEXES = [
  {
    key: { userId: 1, plantId: 1 },
    name: 'plant_likes_user_plant_unique',
    unique: true
  },
  {
    key: { plantId: 1 },
    name: 'plant_likes_plant_idx'
  }
];

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;
const NAMESPACE_EXISTS = 48;

const createCollectionIfMissing = async (db, name) => {
  try {
    await db.createCollection(name);
  } catch (error) {
    if (error?.code !== NAMESPACE_EXISTS) throw error;
  }
};

const listIndexes = async (collection) => {
  try {
    return await collection.indexes();
  } catch (error) {
    if (error?.code === NAMESPACE_NOT_FOUND) return [];
    throw error;
  }
};

const dropIndexIfExists = async (collection, name) => {
  try {
    await collection.dropIndex(name);
  } catch (error) {
    if (
      error?.code !== INDEX_NOT_FOUND &&
      error?.code !== NAMESPACE_NOT_FOUND
    ) {
      throw error;
    }
  }
};

// Field order matters in a compound index, so keys are compared in order.
const sameKey = (actual, expected) =>
  JSON.stringify(Object.entries(actual)) ===
  JSON.stringify(Object.entries(expected));

const sameUnique = (actual, expected) => Boolean(actual) === Boolean(expected);

// Same name, older definition (key or uniqueness): rebuilt so `up` always
// converges to INDEXES. Each index is reconciled on its own.
const reconcileIndex = async (collection, existing, index) => {
  const unique = Boolean(index.unique);

  if (
    existing !== undefined &&
    sameKey(existing.key, index.key) &&
    sameUnique(existing.unique, unique)
  ) {
    return;
  }
  if (existing !== undefined) {
    await collection.dropIndex(index.name);
  }

  const options = { name: index.name };
  if (unique) options.unique = true;

  await collection.createIndex(index.key, options);
};

export const up = async (db) => {
  if (typeof db.createCollection === 'function') {
    await createCollectionIfMissing(db, COLLECTION_NAME);
  }

  const collection = db.collection(COLLECTION_NAME);
  const existingIndexes = await listIndexes(collection);
  const existingByName = new Map(existingIndexes.map((idx) => [idx.name, idx]));

  await Promise.all(
    INDEXES.map((index) =>
      reconcileIndex(collection, existingByName.get(index.name), index)
    )
  );
};

export const down = async (db) => {
  const collection = db.collection(COLLECTION_NAME);

  await Promise.all(
    INDEXES.map((index) => dropIndexIfExists(collection, index.name))
  );

  if (typeof collection.drop === 'function') {
    try {
      await collection.drop();
    } catch (error) {
      if (error?.code !== NAMESPACE_NOT_FOUND) {
        throw error;
      }
    }
  }
};
