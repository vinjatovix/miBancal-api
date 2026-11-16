import type { UserBookmarks } from '../../domain/entities/UserBookmarks.js';
import type { MongoUserBookmarksDocument } from '../../infrastructure/persistence/types/MongoUserBookmarksDocument.js';

export interface UserBookmarksPersistenceMapper {
  fromMongoDocument(document: MongoUserBookmarksDocument): UserBookmarks;
  toMongoDocument(aggregate: UserBookmarks): MongoUserBookmarksDocument;
}
