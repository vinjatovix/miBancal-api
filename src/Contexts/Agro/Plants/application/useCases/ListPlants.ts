import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { createUserId } from '../../../../Auth/domain/UserId.js';
import {
  cacheAside,
  catalogListKey,
  catalogNamespace,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { DomainUnauthorizedException } from '../../../../shared/domain/errors/DomainUnauthorizedException.js';
import type { UserBookmarksRepository } from '../../../Bookmarks/domain/repositories/interfaces/UserBookmarksRepository.js';
import type { PlantFilter } from '../../domain/entities/types/PlantFilter.js';
import { PlantStatus } from '../../domain/entities/types/PlantStatus.js';
import type { PlantLikesCounterRepository } from '../../domain/repositories/interfaces/PlantLikesCounterRepository.js';
import type {
  FamilySummaryReader,
  PlantField,
  PlantReadRepository,
  PlantRelation,
  PlantSparseView
} from '../queries/index.js';
import { canSeeDeletedPlants } from './canSeeDeletedPlants.js';
import { embedFamilySummaries, embedsFamily } from './embedFamilySummaries.js';
import type { ListPlantsDto } from './interfaces/ListPlantsDto.js';

export type ListPlantsDependencies = {
  plantReadRepository: PlantReadRepository;
  familySummaryReader: FamilySummaryReader;
  userBookmarksRepository: UserBookmarksRepository;
  plantLikesCounterRepository: PlantLikesCounterRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class ListPlants {
  private readonly plantReadRepository: PlantReadRepository;
  private readonly familySummaryReader: FamilySummaryReader;
  private readonly userBookmarksRepository: UserBookmarksRepository;
  private readonly plantLikesCounterRepository: PlantLikesCounterRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    plantReadRepository,
    familySummaryReader,
    userBookmarksRepository,
    plantLikesCounterRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: ListPlantsDependencies) {
    this.plantReadRepository = plantReadRepository;
    this.familySummaryReader = familySummaryReader;
    this.userBookmarksRepository = userBookmarksRepository;
    this.plantLikesCounterRepository = plantLikesCounterRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    user: UserSessionInfo | undefined,
    dto?: ListPlantsDto
  ): Promise<PaginatedResult<PlantSparseView>> {
    const options = dto?.query ?? {};
    const { include: _include, ...query } = options;
    const userFilters = query.filter ?? {};
    const isBookmarkScopedRead = userFilters.bookmarked?.eq !== undefined;
    const isPrivilegedRead = canSeeDeletedPlants(user);
    const isIdentityScopedRead = isPrivilegedRead || isBookmarkScopedRead;

    if (isIdentityScopedRead) {
      const filters: PlantFilter = isPrivilegedRead
        ? userFilters
        : { ...userFilters, status: { eq: PlantStatus.ACTIVE } };
      const effectiveFilters = await this.applyBookmarkFilter(user, filters);
      const page = await this.plantReadRepository.findAll({
        ...query,
        filter: effectiveFilters
      });
      return this.withFamily(page, options);
    }

    const { bookmarked: _bookmarked, ...publicFilters } = userFilters;
    const filter: PlantFilter = {
      ...publicFilters,
      status: { eq: PlantStatus.ACTIVE }
    };
    const effectiveQuery = { ...query, filter };
    const generation = await this.cacheRepository.currentGeneration(
      catalogNamespace('plants')
    );
    const key = catalogListKey('plants', generation, effectiveQuery);

    const page = await cacheAside(
      this.cacheRepository,
      key,
      this.cacheCatalogTtlSeconds,
      async () => {
        const result = await this.plantReadRepository.findAll(effectiveQuery);
        const dataWithoutVolatileLikes = result.data.map(stripLikesCount);
        return { ...result, data: dataWithoutVolatileLikes };
      }
    );

    const data = wantsLikes(query.fields)
      ? await this.mergeLikes(page.data)
      : page.data;

    return this.withFamily({ ...page, data }, options);
  }

  private async withFamily(
    page: PaginatedResult<PlantSparseView>,
    options: ReadOptions<PlantField, PlantRelation>
  ): Promise<PaginatedResult<PlantSparseView>> {
    if (!embedsFamily(options)) {
      return page;
    }
    return {
      ...page,
      data: await embedFamilySummaries(page.data, this.familySummaryReader)
    };
  }

  private async mergeLikes(
    views: readonly PlantSparseView[]
  ): Promise<PlantSparseView[]> {
    const counts = await this.plantLikesCounterRepository.getLikesCounts(
      views.map((view) => view.id)
    );
    return views.map((view) => ({
      ...view,
      likesCount: counts.get(view.id) ?? 0
    }));
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

const stripLikesCount = (view: PlantSparseView): PlantSparseView => {
  const { likesCount: _likesCount, ...rest } = view;
  return rest;
};

const wantsLikes = (fields: readonly string[] | undefined): boolean =>
  fields === undefined || fields.includes('likesCount');
