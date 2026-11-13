import type { UserSessionInfo } from '../../../../Auth/application/interfaces/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import type { FamilySummaryReader } from '../../../Plants/application/queries/FamilySummaryReader.js';
import { PlantStatus } from '../../../Plants/domain/entities/types/PlantStatus.js';
import type { PlantRepository } from '../../../Plants/domain/repositories/interfaces/PlantRepository.js';
import type { UserBookmarksRepository } from '../../domain/repositories/interfaces/UserBookmarksRepository.js';
import type {
  EnrichedFavoritePlantItem,
  EnrichedPlantSummary,
  UserBookmarksResponse
} from '../dtos/index.js';

export type GetUserBookmarksInput = {
  include?: 'plant' | undefined;
};

export type GetUserBookmarksDependencies = {
  userBookmarksRepository: UserBookmarksRepository;
  plantRepository: PlantRepository;
  familySummaryReader: FamilySummaryReader;
};

export class GetUserBookmarks {
  private readonly userBookmarksRepository: UserBookmarksRepository;
  private readonly plantRepository: PlantRepository;
  private readonly familySummaryReader: FamilySummaryReader;

  constructor({
    userBookmarksRepository,
    plantRepository,
    familySummaryReader
  }: GetUserBookmarksDependencies) {
    this.userBookmarksRepository = userBookmarksRepository;
    this.plantRepository = plantRepository;
    this.familySummaryReader = familySummaryReader;
  }

  async execute(
    query: GetUserBookmarksInput,
    user: UserSessionInfo
  ): Promise<UserBookmarksResponse> {
    const userId = createUserId(user.id);
    const bookmarks = await this.userBookmarksRepository.findByUserId(userId);

    if (!bookmarks || bookmarks.plants.length === 0) {
      return { plants: [] };
    }

    if (query.include !== 'plant') {
      return {
        plants: bookmarks.plants.map((item) => item.toPrimitives())
      };
    }

    const plantIds = bookmarks.plants.map((item) => item.plantId);
    const plants = await this.plantRepository.findByIds(plantIds);

    const activePlants = plants.filter(
      (plant) => plant.status === PlantStatus.ACTIVE && !plant.deletedAt
    );

    const familyIds = [
      ...new Set(activePlants.map((plant) => plant.identity.family.toString()))
    ];
    const familySummaries =
      await this.familySummaryReader.findSummariesByIds(familyIds);
    const familyMap = new Map(
      familySummaries.map((family) => [family.id, family])
    );

    const plantSummaryMap = new Map<string, EnrichedPlantSummary>(
      activePlants.map((plant) => {
        const familyId = plant.identity.family.toString();
        const familySummary = familyMap.get(familyId);
        const image = plant.knowledge.primaryImage();

        const summary: EnrichedPlantSummary = {
          id: plant.id,
          name: plant.identity.name.primary,
          scientificName: plant.identity.scientificName,
          primaryImage: image
            ? {
                url: image.url,
                title: image.title ?? '',
                source: image.source ?? ''
              }
            : null,
          family: familySummary ?? {
            id: familyId,
            name: familyId,
            slug: familyId
          }
        };

        return [plant.id, summary];
      })
    );

    const enrichedItems: EnrichedFavoritePlantItem[] = [];

    for (const item of bookmarks.plants) {
      const plantSummary = plantSummaryMap.get(item.plantId);
      if (plantSummary) {
        enrichedItems.push({
          plantId: item.plantId,
          bookmarkedAt: item.bookmarkedAt.toISOString(),
          plant: plantSummary
        });
      }
    }

    enrichedItems.sort((a, b) => a.plant.name.localeCompare(b.plant.name));

    return { plants: enrichedItems };
  }
}
