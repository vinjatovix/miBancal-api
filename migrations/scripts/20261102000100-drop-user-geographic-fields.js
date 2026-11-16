// Data-transform cleanup (not seed data): the User aggregate no longer
// carries geography (moved to the Locations context). Existing `users`
// documents may still hold the four stale fields; this unsets them so no
// orphaned data lingers. Idempotent: `$unset` on an absent field is a no-op,
// so `up` can run more than once. No backfill — nothing reads these fields
// anymore (FR-015).

const USERS = 'users';

export const up = async (db) => {
  await db.collection(USERS).updateMany(
    {},
    {
      $unset: {
        postalCode: '',
        country: '',
        timezone: '',
        hemisphere: ''
      }
    }
  );
};

export const down = async () => {
  // Irreversible by design: the removed values are not recoverable, and
  // User no longer reads or writes them.
};
