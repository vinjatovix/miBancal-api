import { createUserId } from '../../../Auth/domain/UserId.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { createPlantId } from '../../Plants/domain/PlantId.js';
import { UserBookmarks } from '../domain/entities/UserBookmarks.js';
import { createUserBookmarksId } from '../domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../domain/value-objects/FavoritePlantItem.js';
import type { MongoUserBookmarksDocument } from '../infrastructure/persistence/types/MongoUserBookmarksDocument.js';
import type { UserBookmarksPersistenceMapper } from './interfaces/UserBookmarksPersistenceMapper.js';

export const userBookmarksPersistenceMapper: UserBookmarksPersistenceMapper = {
  fromMongoDocument(document: MongoUserBookmarksDocument): UserBookmarks {
    return new UserBookmarks({
      id: createUserBookmarksId(fromMongoId(document._id)),
      userId: createUserId(fromMongoId(document.userId)),
      plants: (document.plants ?? []).map(
        (p) =>
          new FavoritePlantItem(
            createPlantId(fromMongoId(p.plantId)),
            p.bookmarkedAt instanceof Date
              ? p.bookmarkedAt
              : new Date(p.bookmarkedAt)
          )
      ),
      metadata: Metadata.fromPrimitives(document.metadata),
      version: document.version
    });
  },

  toMongoDocument(aggregate: UserBookmarks): MongoUserBookmarksDocument {
    return {
      _id: toMongoId(aggregate.id),
      userId: toMongoId(aggregate.userId),
      plants: aggregate.plants.map((item) => ({
        plantId: toMongoId(item.plantId),
        bookmarkedAt: item.bookmarkedAt
      })),
      metadata: aggregate.metadata.toPrimitives(),
      version: aggregate.version
    };
  }
};
