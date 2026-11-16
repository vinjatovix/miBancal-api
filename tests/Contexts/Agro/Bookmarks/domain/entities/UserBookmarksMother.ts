import { UserBookmarks } from '../../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import { randomUserBookmarksId } from '../../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

export class UserBookmarksMother {
  static ofPlants(userIdValue: string, plantIds: string[]): UserBookmarks {
    const userId = createUserId(userIdValue);
    return new UserBookmarks({
      id: randomUserBookmarksId(),
      userId: userId,
      plants: plantIds.map(
        (id) => new FavoritePlantItem(createPlantId(id), new Date())
      ),
      metadata: Metadata.create(userId, new Date()),
      version: 0
    });
  }
}
