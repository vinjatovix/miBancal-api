const BEDS = 'beds';
const INDEX_NAME = 'beds_userId_locationId';
const INDEX_KEY = { userId: 1, locationId: 1 };
const INDEX_OPTIONS = {
  name: INDEX_NAME,
  partialFilterExpression: { deleted: false }
};

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;

export const up = async (db) => {
  try {
    await db.collection(BEDS).createIndex(INDEX_KEY, INDEX_OPTIONS);
  } catch (error) {
    throw new Error(
      `Cannot create index ${INDEX_NAME} on ${BEDS}: ${error?.message}`,
      { cause: error }
    );
  }
};

export const down = async (db) => {
  try {
    await db.collection(BEDS).dropIndex(INDEX_NAME);
  } catch (error) {
    if (
      error?.code !== INDEX_NOT_FOUND &&
      error?.code !== NAMESPACE_NOT_FOUND
    ) {
      throw error;
    }
  }
};
