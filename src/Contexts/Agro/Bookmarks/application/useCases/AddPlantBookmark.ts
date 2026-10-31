import type { UserSessionInfo } from '../../../../Auth/application/interfaces/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../shared/domain/errors/index.js';
import { createPlantId } from '../../../Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import { UserBookmarks } from '../../domain/entities/UserBookmarks.js';
import type { UserBookmarksRepository } from '../../domain/repositories/interfaces/UserBookmarksRepository.js';
import { randomUserBookmarksId } from '../../domain/UserBookmarksId.js';
import type { FavoritePlantItemPrimitives } from '../../domain/value-objects/types/FavoritePlantItemPrimitives.js';

export type AddPlantBookmarkInput = {
  plantId: string;
};

export type AddPlantBookmarkResult = {
  item: FavoritePlantItemPrimitives;
  status: 201 | 200;
};

export type AddPlantBookmarkDependencies = {
  userBookmarksRepository: UserBookmarksRepository;
  plantRepository: PlantRepository;
};

export class AddPlantBookmark {
  private readonly userBookmarksRepository: UserBookmarksRepository;
  private readonly plantRepository: PlantRepository;

  constructor({
    userBookmarksRepository,
    plantRepository
  }: AddPlantBookmarkDependencies) {
    this.userBookmarksRepository = userBookmarksRepository;
    this.plantRepository = plantRepository;
  }

  async execute(
    dto: AddPlantBookmarkInput,
    user: UserSessionInfo
  ): Promise<AddPlantBookmarkResult> {
    const plant = await this.plantRepository.findActiveById(dto.plantId);
    if (!plant) {
      throw new DomainNotFoundException(`Plant not found: ${dto.plantId}`);
    }

    const userId = createUserId(user.id);
    const existing = await this.userBookmarksRepository.findByUserId(userId);
    const plantId = createPlantId(dto.plantId);

    if (!existing) {
      // On-demand initialization. Known v1 limitation: two simultaneous
      // first-ever adds for this user both reach here and insert; the unique
      // userId index rejects the loser, surfacing a write conflict instead of
      // reloading the winner and retrying. Confined to the first concurrent
      // write per user; transparent recovery is deferred (see spec 038).
      const aggregate = UserBookmarks.create(
        randomUserBookmarksId(),
        userId,
        user.username
      );
      aggregate.addPlant(plantId, user.username);
      await this.userBookmarksRepository.save(aggregate);
      const item = aggregate.getPlantBookmark(plantId);
      if (!item) {
        throw new DomainNotFoundException(`Bookmark not found: ${dto.plantId}`);
      }
      return { item: item.toPrimitives(), status: 201 };
    }

    const before = existing.toPrimitives();
    const added = existing.addPlant(plantId, user.username);

    if (added) {
      await this.userBookmarksRepository.updateWithDiff(
        before,
        existing.toPrimitives()
      );
    }

    const item = existing.getPlantBookmark(plantId);
    if (!item) {
      throw new DomainNotFoundException(`Bookmark not found: ${dto.plantId}`);
    }

    return { item: item.toPrimitives(), status: added ? 201 : 200 };
  }
}
