// Inline snapshots of shared/domain/utils/deriveGenus and shared/domain/utils/slugify —
// no app imports allowed in migrations.
const GENUS_PATTERN = /^[A-Z][a-zA-Z]{1,49}$/;

const deriveGenus = (scientificName) => {
  const firstWord = scientificName?.trim().split(/\s+/)[0];
  if (!firstWord) return undefined;

  const capitalized =
    firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();

  return GENUS_PATTERN.test(capitalized) ? capitalized : undefined;
};

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');

export const up = async (db) => {
  const collection = db.collection('plants');

  const plantsWithoutGenus = await collection
    .find(
      { 'identity.genus': { $exists: false } },
      { projection: { 'identity.scientificName': 1 } }
    )
    .toArray();

  const genusOps = [];
  for (const plant of plantsWithoutGenus) {
    const genus = deriveGenus(plant.identity?.scientificName);
    if (genus !== undefined) {
      genusOps.push({
        updateOne: {
          filter: { _id: plant._id },
          update: { $set: { 'identity.genus': genus } }
        }
      });
    }
  }
  if (genusOps.length > 0) {
    await collection.bulkWrite(genusOps, { ordered: false });
  }

  const plantsWithoutSlug = await collection
    .find(
      { slug: { $exists: false } },
      { projection: { 'identity.scientificName': 1 } }
    )
    .toArray();

  const slugOps = plantsWithoutSlug
    .filter((p) => p.identity?.scientificName)
    .map((p) => ({
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { slug: slugify(p.identity.scientificName) } }
      }
    }));

  if (slugOps.length > 0) {
    await collection.bulkWrite(slugOps, { ordered: false });
  }
};

export const down = async (db) => {
  await db
    .collection('plants')
    .updateMany({}, { $unset: { 'identity.genus': '', slug: '' } });
};
