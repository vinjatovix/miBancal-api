/**
 * Owns the read-only `likesCount` projection on the `plants` collection, so
 * every write to that collection stays inside the Plants bounded context. The
 * PlantLikes use cases orchestrate these calls inside the shared
 * `MongoUnitOfWork` transaction (joined through the ambient session), so the
 * counter delta commits atomically with the interaction write.
 */
export interface PlantLikesCounterRepository {
  /** `$inc { likesCount: +1 }` on the plant. */
  increment(plantId: string): Promise<void>;
  /** `$inc { likesCount: -1 }` on the plant, floored at zero. */
  decrement(plantId: string): Promise<void>;
}
