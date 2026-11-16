const COLLECTION_NAME = 'outbox_progress';

const NAMESPACE_NOT_FOUND = 26;
const NAMESPACE_EXISTS = 48;

const createCollectionIfMissing = async (db, name) => {
  try {
    await db.createCollection(name);
  } catch (error) {
    if (error?.code !== NAMESPACE_EXISTS) throw error;
  }
};

export const up = async (db) => {
  if (typeof db.createCollection === 'function') {
    await createCollectionIfMissing(db, COLLECTION_NAME);
  }
};

export const down = async (db) => {
  const collection = db.collection(COLLECTION_NAME);

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
