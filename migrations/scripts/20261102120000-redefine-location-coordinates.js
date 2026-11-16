// DDL database migration cleanup: Location model and Bed climate snapshot
// have been redefined to rely strictly on geographic coordinates (latitude and longitude).
// This unsets legacy fields (postalCode, country, timezone, hemisphere) from
// both `locations` and `beds` collections so no orphaned data lingers.
// Idempotent: `$unset` on an absent field is a no-op, so `up` can run more than once.

const LOCATIONS = 'locations';
const BEDS = 'beds';

export const up = async (db) => {
  await db.collection(LOCATIONS).updateMany(
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

  await db.collection(BEDS).updateMany(
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
  // Irreversible by design: the removed legacy values are not recoverable,
  // and the domain aggregates no longer read or write them.
};
