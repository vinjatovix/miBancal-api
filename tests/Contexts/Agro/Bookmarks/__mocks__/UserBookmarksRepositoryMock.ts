import type { UserBookmarksPrimitives } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/types/UserBookmarksPrimitives.js';
import type { UserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import type { UserBookmarksRepository } from '../../../../../src/Contexts/Agro/Bookmarks/domain/repositories/interfaces/UserBookmarksRepository.js';
import type { UserBookmarksId } from '../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import type { UserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import type { WriteOutcome } from '../../../../../src/Contexts/shared/domain/repositories/WriteOutcome.js';

export class UserBookmarksRepositoryMock implements UserBookmarksRepository {
  private readonly storage = new Map<string, UserBookmarks>();

  addToStorage(bookmarks: UserBookmarks): void {
    this.storage.set(bookmarks.userId, bookmarks);
  }

  findById(id: UserBookmarksId): Promise<UserBookmarks | null> {
    for (const bookmarks of this.storage.values()) {
      if (bookmarks.id === id) {
        return Promise.resolve(bookmarks);
      }
    }
    return Promise.resolve(null);
  }

  findByUserId(userId: UserId): Promise<UserBookmarks | null> {
    return Promise.resolve(this.storage.get(userId) || null);
  }

  save(bookmarks: UserBookmarks): Promise<void> {
    this.addToStorage(bookmarks);
    return Promise.resolve();
  }

  updateWithDiff(
    _before: UserBookmarksPrimitives,
    _after: UserBookmarksPrimitives
  ): Promise<WriteOutcome> {
    throw new Error('Not implemented');
  }

  delete(bookmarks: UserBookmarks): Promise<void> {
    this.storage.delete(bookmarks.userId);
    return Promise.resolve();
  }
}
