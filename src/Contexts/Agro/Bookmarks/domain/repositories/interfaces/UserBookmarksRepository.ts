import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { UserId } from '../../../../../Auth/domain/UserId.js';
import type { WriteOutcome } from '../../../../../shared/domain/repositories/WriteOutcome.js';
import type { UserBookmarksPrimitives } from '../../entities/types/UserBookmarksPrimitives.js';
import type { UserBookmarks } from '../../entities/UserBookmarks.js';
import type { UserBookmarksId } from '../../UserBookmarksId.js';

export interface UserBookmarksRepository {
  findById(id: UserBookmarksId): Promise<Nullable<UserBookmarks>>;
  findByUserId(userId: UserId): Promise<Nullable<UserBookmarks>>;
  save(aggregate: UserBookmarks): Promise<void>;
  updateWithDiff(
    before: UserBookmarksPrimitives,
    after: UserBookmarksPrimitives
  ): Promise<WriteOutcome>;
}
