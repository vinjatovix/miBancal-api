export type PlantLikePrimitives = {
  id: string;
  /** Owning user (session identity). Immutable. */
  userId: string;
  /** Active catalog plant at creation time. Immutable. */
  plantId: string;
  /** Moment the like was registered (ISO date-time). */
  likedAt: string;
};
