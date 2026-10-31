/**
 * Own-like-state answer. `likedAt` is present only when `liked` is true; it is
 * omitted (never `null`) otherwise, per the no-persisted/serialized-null rule.
 */
export type CheckPlantLikeResponse = {
  liked: boolean;
  likedAt?: string | undefined;
};
