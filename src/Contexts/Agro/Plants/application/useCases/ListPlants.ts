import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import { DomainUnauthorizedException } from '../../../../shared/domain/errors/DomainUnauthorizedException.js';
import type { UserBookmarksRepository } from '../../../Bookmarks/domain/repositories/interfaces/UserBookmarksRepository.js';
import type { PlantFilter } from '../../domain/entities/types/PlantFilter.js';
import { PlantStatus } from '../../domain/entities/types/PlantStatus.js';
import type {
  FamilySummaryReader,
  PlantReadRepository,
  PlantSparseView
} from '../queries/index.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';
import { embedFamilySummaries, embedsFamily } from './embedFamilySummaries.js';
import type { ListPlantsDto } from './interfaces/ListPlantsDto.js';

export type ListPlantsDependencies = {
  plantReadRepository: PlantReadRepository;
  familySummaryReader: FamilySummaryReader;
  userBookmarksRepository: UserBookmarksRepository;
};

export class ListPlants {
  private readonly plantReadRepository: PlantReadRepository;
  private readonly familySummaryReader: FamilySummaryReader;
  private readonly userBookmarksRepository: UserBookmarksRepository;

  constructor({
    plantReadRepository,
    familySummaryReader,
    userBookmarksRepository
  }: ListPlantsDependencies) {
    this.plantReadRepository = plantReadRepository;
    this.familySummaryReader = familySummaryReader;
    this.userBookmarksRepository = userBookmarksRepository;
  }
  async execute(
    user: UserSessionInfo | undefined,
    dto?: ListPlantsDto
  ): Promise<PaginatedResult<PlantSparseView>> {
    const options = dto?.query ?? {};
    // Relations are resolved here, never by the repository.
    const { include: _include, ...query } = options;
    const userFilters = query.filter ?? {};

    const filters: PlantFilter = canSeeDeletedPlants(user)
      ? userFilters
      : { ...userFilters, status: { eq: PlantStatus.ACTIVE } };

    const effectiveFilters = await this.applyBookmarkFilter(user, filters);

    const page = await this.plantReadRepository.findAll({
      ...query,
      filter: effectiveFilters
    });

    return {
      ...page,
      data: embedsFamily(options)
        ? await embedFamilySummaries(page.data, this.familySummaryReader)
        : page.data
    };
  }

  private async applyBookmarkFilter(
    user: UserSessionInfo | undefined,
    filters: PlantFilter
  ): Promise<PlantFilter> {
    const { bookmarked, ...restFilters } = filters;

    if (bookmarked?.eq === undefined) {
      return restFilters;
    }

    if (user === undefined) {
      throw new DomainUnauthorizedException('Authentication required');
    }

    const userId = createUserId(user.id);
    const bookmarks = await this.userBookmarksRepository.findByUserId(userId);
    const bookmarkedIds = bookmarks
      ? bookmarks.plants.map((p) => p.plantId)
      : [];

    return {
      ...restFilters,
      id: bookmarked.eq ? { in: bookmarkedIds } : { nin: bookmarkedIds }
    };
  }
}
