import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { PlantLike } from '../../entities/PlantLike.js';

/**
 * Store of plant likes. It writes **only** the `plant_likes` collection and
 * never touches `likesCount` (that projection is owned by the Plants context's
 * `PlantLikesCounterRepository`). Every method joins the active
 * `MongoUnitOfWork` transaction through the ambient session context, so the
 * like write and the counter `$inc` commit atomically.
 */
export interface PlantLikeRepository {
  /**
   * Inserts the like. A duplicate `(userId, plantId)` is an idempotent no-op.
   * Returns `true` when a new like was created, `false` when one already
   * existed (so the caller skips the counter increment).
   */
  add(like: PlantLike): Promise<boolean>;
  /**
   * Deletes the like. A missing like is an idempotent no-op. Returns `true`
   * when a like was actually removed (so the caller applies the counter
   * decrement), `false` otherwise.
   */
  remove(userId: string, plantId: string): Promise<boolean>;
  /**
   * Point lookup used both for own-like-state checks and to read the existing
   * `likedAt` on the idempotent `200` like path.
   */
  find(userId: string, plantId: string): Promise<Nullable<PlantLike>>;
}
