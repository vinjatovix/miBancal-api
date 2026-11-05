const COLLECTION_NAME = 'plant_relations';

const LEGACY_UNIQUE_INDEX = {
  key: { sourcePlantId: 1, targetPlantId: 1, mechanism: 1 },
  name: 'plant_relations_pair_mechanism_unique',
  unique: true
};

const NEW_INDEXES = [
  {
    key: {
      'source.scope': 1,
      'source.value': 1,
      'target.scope': 1,
      'target.value': 1,
      mechanism: 1
    },
    name: 'plant_relations_scoped_unique',
    unique: true
  },
  {
    key: { 'source.scope': 1, 'source.value': 1 },
    name: 'plant_relations_source_scoped_idx',
    unique: false
  },
  {
    key: { 'target.scope': 1, 'target.value': 1 },
    name: 'plant_relations_target_scoped_idx',
    unique: false
  },
  {
    key: { 'target.scope': 1 },
    name: 'plant_relations_broadcast_idx',
    unique: false
  }
];

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;

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

const backfillScopedFields = async (collection) => {
  await collection.updateMany(
    { source: { $exists: false }, sourcePlantId: { $exists: true } },
    [
      {
        $set: {
          source: { scope: 'plant', value: '$sourcePlantId' },
          target: { scope: 'plant', value: '$targetPlantId' }
        }
      }
    ]
  );
};

export const up = async (db) => {
  const collection = db.collection(COLLECTION_NAME);

  await backfillScopedFields(collection);

  await dropIndexIfExists(collection, LEGACY_UNIQUE_INDEX.name);

  const existingIndexes = await listIndexes(collection);
  const existingByName = new Map(existingIndexes.map((idx) => [idx.name, idx]));

  await Promise.all(
    NEW_INDEXES.map((index) =>
      reconcileIndex(collection, existingByName.get(index.name), index)
    )
  );
};

export const down = async (db) => {
  const collection = db.collection(COLLECTION_NAME);

  // Drop scoped indexes
  await Promise.all(
    NEW_INDEXES.map((index) => dropIndexIfExists(collection, index.name))
  );

  // Re-establish legacy unique index on rollback
  const existingIndexes = await listIndexes(collection);
  const existingByName = new Map(existingIndexes.map((idx) => [idx.name, idx]));
  await reconcileIndex(
    collection,
    existingByName.get(LEGACY_UNIQUE_INDEX.name),
    LEGACY_UNIQUE_INDEX
  );
};
