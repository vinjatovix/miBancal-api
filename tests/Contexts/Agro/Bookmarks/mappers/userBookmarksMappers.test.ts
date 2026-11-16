import { UserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import { createUserBookmarksId } from '../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import type { MongoUserBookmarksDocument } from '../../../../../src/Contexts/Agro/Bookmarks/infrastructure/persistence/types/MongoUserBookmarksDocument.js';
import { userBookmarksDomainMapper } from '../../../../../src/Contexts/Agro/Bookmarks/mappers/userBookmarksDomainMapper.js';
import { userBookmarksPersistenceMapper } from '../../../../../src/Contexts/Agro/Bookmarks/mappers/userBookmarksPersistenceMapper.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';

describe('UserBookmarks Mappers', () => {
  const bookmarksIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c0';
  const userIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c1';
  const plantIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';
  const bookmarksId = createUserBookmarksId(bookmarksIdStr);
  const userId = createUserId(userIdStr);
  const plantId = createPlantId(plantIdStr);
  const date = new Date('2026-10-22T14:30:00.000Z');

  const buildAggregate = () =>
    new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [new FavoritePlantItem(plantId, date)],
      metadata: Metadata.create(userId, date),
      version: 2
    });

  describe('userBookmarksPersistenceMapper', () => {
    it('converts domain aggregate into mongo document', () => {
      const aggregate = buildAggregate();

      const document =
        userBookmarksPersistenceMapper.toMongoDocument(aggregate);

      expect(fromMongoId(document._id)).toBe(bookmarksIdStr);
      expect(fromMongoId(document.userId)).toBe(userIdStr);
      expect(document.plants).toHaveLength(1);
      expect(fromMongoId(document.plants[0]?.plantId)).toBe(plantIdStr);
      expect(document.plants[0]?.bookmarkedAt).toEqual(date);
      expect(document.version).toBe(2);
    });

    it('converts mongo document with binary IDs and dates into domain aggregate', () => {
      const mongoDoc: MongoUserBookmarksDocument = {
        _id: toMongoId(bookmarksIdStr),
        userId: toMongoId(userIdStr),
        plants: [
          {
            plantId: toMongoId(plantIdStr),
            bookmarkedAt: date
          }
        ],
        metadata: {
          createdAt: date,
          createdBy: userIdStr,
          updatedAt: date,
          updatedBy: userIdStr
        },
        version: 3
      };

      const aggregate =
        userBookmarksPersistenceMapper.fromMongoDocument(mongoDoc);

      expect(aggregate.id).toBe(bookmarksId);
      expect(aggregate.userId).toBe(userId);
      expect(aggregate.plants).toHaveLength(1);
      expect(aggregate.plants[0]?.plantId).toBe(plantId);
      expect(aggregate.plants[0]?.bookmarkedAt).toEqual(date);
      expect(aggregate.version).toBe(3);
    });

    it('converts mongo document with binary IDs and empty plants array gracefully', () => {
      const mongoDoc: MongoUserBookmarksDocument = {
        _id: bookmarksIdStr,
        userId: userIdStr,
        plants: [],
        metadata: {
          createdAt: date,
          createdBy: userIdStr,
          updatedAt: date,
          updatedBy: userIdStr
        },
        version: 0
      };

      const aggregate =
        userBookmarksPersistenceMapper.fromMongoDocument(mongoDoc);

      expect(aggregate.id).toBe(bookmarksId);
      expect(aggregate.plants).toEqual([]);
    });
  });

  describe('userBookmarksDomainMapper', () => {
    it('serializes domain aggregate to primitives', () => {
      const aggregate = buildAggregate();

      const primitives = userBookmarksDomainMapper.toPrimitives(aggregate);

      expect(primitives.id).toBe(bookmarksIdStr);
      expect(primitives.userId).toBe(userIdStr);
      expect(primitives.plants).toEqual([
        {
          plantId: plantIdStr,
          bookmarkedAt: date.toISOString()
        }
      ]);
      expect(primitives.version).toBe(2);
    });

    it('restores domain aggregate from primitives', () => {
      const aggregate = buildAggregate();
      const primitives = userBookmarksDomainMapper.toPrimitives(aggregate);

      const restored = userBookmarksDomainMapper.fromPrimitives(primitives);

      expect(restored.toPrimitives()).toEqual(primitives);
    });
  });
});
