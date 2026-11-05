export const up = async (db) => {
  await db.collection('plants').createIndex(
    { 'identity.genus': 1 },
    {
      name: 'plants_genus_idx',
      collation: { locale: 'es', strength: 2 }
    }
  );
};

export const down = async (db) => {
  const collection = db.collection('plants');
  const indexes = await collection.indexes();
  const exists = indexes.some((idx) => idx.name === 'plants_genus_idx');
  if (exists) {
    await collection.dropIndex('plants_genus_idx');
  }
};
