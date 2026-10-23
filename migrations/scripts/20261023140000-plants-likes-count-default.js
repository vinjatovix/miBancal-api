const COLLECTION_NAME = 'plants';

// Trivial schema default: dev and prod hold no plant data yet, so this sets
// the `likesCount` projection to 0 on any document that predates the feature.
export const up = async (db) => {
  const collection = db.collection(COLLECTION_NAME);

  await collection.updateMany(
    { likesCount: { $exists: false } },
    { $set: { likesCount: 0 } }
  );
};

export const down = async (db) => {
  const collection = db.collection(COLLECTION_NAME);

  await collection.updateMany({}, { $unset: { likesCount: '' } });
};
