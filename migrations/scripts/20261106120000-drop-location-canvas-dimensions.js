// DDL schema migration cleanup: Location model no longer carries canvas dimensions
// (width and height), as cultivation layouts now support an unbounded canvas.
// This unsets legacy fields (canvasWidth, canvasHeight) from the `locations`
// collection so no orphaned data lingers.
// Idempotent: `$unset` on absent fields is a no-op, so `up` can run more than once.

const LOCATIONS = 'locations';

export const up = async (db) => {
  await db.collection(LOCATIONS).updateMany(
    {},
    {
      $unset: {
        canvasWidth: '',
        canvasHeight: ''
      }
    }
  );
};

export const down = async () => {
  // Irreversible by design: the removed legacy values are not recoverable,
  // and the domain aggregates no longer read or write them.
};
