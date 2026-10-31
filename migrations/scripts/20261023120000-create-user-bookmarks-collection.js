const COLLECTION_NAME = 'user_bookmarks';
const INDEX_NAME = 'user_bookmarks_user_id_unique';
const INDEX_KEY = { userId: 1 };
const INDEX_OPTIONS = {
  name: INDEX_NAME,
  unique: true
};

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

const sameKey = (actual, expected) =>
  JSON.stringify(Object.entries(actual)) ===
  JSON.stringify(Object.entries(expected));

const sameUnique = (actual, expected) => Boolean(actual) === Boolean(expected);

const reconcileIndex = async (collection, existing, key, options) => {
  if (
    existing !== undefined &&
    sameKey(existing.key, key) &&
    sameUnique(existing.unique, options.unique)
  ) {
    return;
  }
  if (existing !== undefined) {
    await collection.dropIndex(options.name);
  }
  await collection.createIndex(key, options);
};

export const up = async (db) => {
  if (typeof db.createCollection === 'function') {
    await createCollectionIfMissing(db, COLLECTION_NAME);
  }

  const collection = db.collection(COLLECTION_NAME);
  const existingIndexes = await listIndexes(collection);
  const existingByName = new Map(existingIndexes.map((idx) => [idx.name, idx]));

  await reconcileIndex(
    collection,
    existingByName.get(INDEX_NAME),
    INDEX_KEY,
    INDEX_OPTIONS
  );
};

export const down = async (db) => {
  const collection = db.collection(COLLECTION_NAME);

  await dropIndexIfExists(collection, INDEX_NAME);

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
