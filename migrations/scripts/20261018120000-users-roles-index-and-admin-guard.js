// Two reproducible setup artifacts for concurrency-safe last-administrator
// handling. (1) A multikey index on `roles` so `countByRole` is served by an
// index path instead of scanning `users`, which grows per account. (2) A
// `roleGuards` guard document per minimum-holder role: a shared write target
// every `admin`-mutating transaction touches, so two concurrent admin changes
// collide on it. The guard carries only `_id` (the role) and `updatedAt`;
// never a null. No data is moved. `up` can run more than once: `createIndex`
// with the same definition is a no-op, and the guard is seeded only if absent.

const USERS_COLLECTION = 'users';
const INDEX_NAME = 'users_roles';
const INDEX_KEY = { roles: 1 };
const INDEX_OPTIONS = { name: INDEX_NAME };

const ROLE_GUARDS_COLLECTION = 'roleGuards';
const ADMIN_GUARD_ID = 'admin';

const NAMESPACE_NOT_FOUND = 26;
const INDEX_NOT_FOUND = 27;

export const up = async (db) => {
  try {
    await db.collection(USERS_COLLECTION).createIndex(INDEX_KEY, INDEX_OPTIONS);
  } catch (error) {
    throw new Error(
      `Cannot create index ${INDEX_NAME} on ${USERS_COLLECTION}: ${error?.message}`,
      { cause: error }
    );
  }

  // Seed-if-absent: a re-run must neither fail nor overwrite the guard.
  await db
    .collection(ROLE_GUARDS_COLLECTION)
    .updateOne(
      { _id: ADMIN_GUARD_ID },
      { $setOnInsert: { updatedAt: new Date() } },
      { upsert: true }
    );
};

export const down = async (db) => {
  try {
    await db.collection(USERS_COLLECTION).dropIndex(INDEX_NAME);
  } catch (error) {
    if (error?.code !== INDEX_NOT_FOUND && error?.code !== NAMESPACE_NOT_FOUND)
      throw error;
  }

  await db
    .collection(ROLE_GUARDS_COLLECTION)
    .deleteOne({ _id: ADMIN_GUARD_ID });
};
