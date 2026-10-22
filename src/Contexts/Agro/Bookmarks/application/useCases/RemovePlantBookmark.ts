import type { UserSessionInfo } from '../../../../Auth/application/interfaces/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import { createPlantId } from '../../../Plants/domain/PlantId.js';
import type { UserBookmarksRepository } from '../../domain/repositories/interfaces/UserBookmarksRepository.js';

export type RemovePlantBookmarkDependencies = {
  userBookmarksRepository: UserBookmarksRepository;
};

export class RemovePlantBookmark {
  private readonly userBookmarksRepository: UserBookmarksRepository;

  constructor({ userBookmarksRepository }: RemovePlantBookmarkDependencies) {
    this.userBookmarksRepository = userBookmarksRepository;
  }

  async execute(plantIdString: string, user: UserSessionInfo): Promise<void> {
    const userId = createUserId(user.id);
    const existing = await this.userBookmarksRepository.findByUserId(userId);
    if (!existing) {
      return;
    }

    const plantId = createPlantId(plantIdString);
    const before = existing.toPrimitives();
    const removed = existing.removePlant(plantId);

    if (removed) {
      await this.userBookmarksRepository.updateWithDiff(
        before,
        existing.toPrimitives()
      );
    }
  }
}
