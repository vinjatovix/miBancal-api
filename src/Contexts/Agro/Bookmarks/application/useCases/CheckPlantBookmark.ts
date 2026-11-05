import type { UserSessionInfo } from '../../../../Auth/application/interfaces/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import { createPlantId } from '../../../Plants/domain/PlantId.js';
import type { UserBookmarksRepository } from '../../domain/repositories/interfaces/UserBookmarksRepository.js';
import type { CheckPlantBookmarkResponse } from '../dtos/index.js';

export type CheckPlantBookmarkDependencies = {
  userBookmarksRepository: UserBookmarksRepository;
};

export class CheckPlantBookmark {
  private readonly userBookmarksRepository: UserBookmarksRepository;

  constructor({ userBookmarksRepository }: CheckPlantBookmarkDependencies) {
    this.userBookmarksRepository = userBookmarksRepository;
  }

  async execute(
    plantIdString: string,
    user: UserSessionInfo
  ): Promise<CheckPlantBookmarkResponse> {
    const userId = createUserId(user.id);
    const bookmarks = await this.userBookmarksRepository.findByUserId(userId);

    if (!bookmarks) {
      return { bookmarked: false };
    }

    const item = bookmarks.getPlantBookmark(createPlantId(plantIdString));
    if (!item) {
      return { bookmarked: false };
    }

    return {
      bookmarked: true,
      bookmarkedAt: item.bookmarkedAt.toISOString()
    };
  }
}
