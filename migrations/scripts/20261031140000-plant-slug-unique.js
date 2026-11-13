// Unique index on the plant slug, the URL-friendly identifier derived from the
// scientific name (`PlantIdentity` slugifies `scientificName`). It makes
// slug-based lookups (`GET /plants/{slug}`) deterministic and indexed. The slug
// is stored lower-cased, so the index needs no collation, like
// `families_slug_unique`. Scientific names are already unique
// (`plants_scientific_name_unique`), so the slug is effectively unique too; a
// soft-deleted plant keeps its slug reserved, matching the scientific-name rule
// (no partial index). `up` can run more than once: `createIndex` with the same
// definition is a no-op, and a conflicting definition or stored duplicates make
// MongoDB reject it, rethrown naming the collection and the index.

const PLANTS = 'plants';
const KEY = { slug: 1 };
const UNIQUE_INDEX = 'plants_slug_unique';

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
  try {
    await db
      .collection(PLANTS)
      .createIndex(KEY, { name: UNIQUE_INDEX, unique: true });
  } catch (error) {
    throw new Error(
      `Cannot create index ${UNIQUE_INDEX} on ${PLANTS}: ${error?.message}`,
      { cause: error }
    );
  }
};

export const down = async (db) => {
  await dropIndexIfExists(db.collection(PLANTS), UNIQUE_INDEX);
};
