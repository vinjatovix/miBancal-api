import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import {
  cacheAside,
  catalogIdKey,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
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

export type GetPlantDependencies = {
  plantReadRepository: PlantReadRepository;
  familySummaryReader: FamilySummaryReader;
  plantLikesCounterRepository: PlantLikesCounterRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class GetPlant {
  private readonly plantReadRepository: PlantReadRepository;
  private readonly familySummaryReader: FamilySummaryReader;
  private readonly plantLikesCounterRepository: PlantLikesCounterRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    plantReadRepository,
    familySummaryReader,
    plantLikesCounterRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: GetPlantDependencies) {
    this.plantReadRepository = plantReadRepository;
    this.familySummaryReader = familySummaryReader;
    this.plantLikesCounterRepository = plantLikesCounterRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    idOrSlug: string,
    user: UserSessionInfo | undefined,
    options: ReadOptions<PlantField, PlantRelation> = {}
  ): Promise<PlantSparseView> {
    const { include: _include, ...readOptions } = options;
    const isPrivilegedRead = canSeeDeletedPlants(user);
    const isSparseFieldRead = readOptions.fields !== undefined;
    const shouldBypassCatalogCache = isPrivilegedRead || isSparseFieldRead;
    const isUuid = UuidValidator.isValid(idOrSlug);

    if (shouldBypassCatalogCache) {
      const found = ensureFound(
        await this.read(idOrSlug, isUuid, isPrivilegedRead, readOptions),
        'Plant',
        idOrSlug,
        isUuid ? undefined : 'slug'
      );
      return this.embedFamily(found, options);
    }

    const key = isUuid
      ? catalogIdKey('plants', idOrSlug)
      : catalogSlugKey('plants', idOrSlug);

    const cachedPlantWithoutLikes = await cacheAside(
      this.cacheRepository,
      key,
      this.cacheCatalogTtlSeconds,
      async () => {
        const found = ensureFound(
          await this.read(idOrSlug, isUuid, false, {}),
          'Plant',
          idOrSlug,
          isUuid ? undefined : 'slug'
        );
        return stripLikesCount(found);
      }
    );

    const liveLikesCount = await this.plantLikesCounterRepository.getLikesCount(
      cachedPlantWithoutLikes.id
    );
    const plantWithLiveLikes: PlantSparseView = {
      ...cachedPlantWithoutLikes,
      likesCount: liveLikesCount
    };

    return this.embedFamily(plantWithLiveLikes, options);
  }

  private async embedFamily(
    plant: PlantSparseView,
    options: ReadOptions<PlantField, PlantRelation>
  ): Promise<PlantSparseView> {
    if (!embedsFamily(options)) {
      return plant;
    }
    const [embedded = plant] = await embedFamilySummaries(
      [plant],
      this.familySummaryReader
    );
    return embedded;
  }

  private read(
    idOrSlug: string,
    isUuid: boolean,
    canSeeDeleted: boolean,
    readOptions: ReadOptions<PlantField>
  ): Promise<Nullable<PlantSparseView>> {
    if (isUuid) {
      return canSeeDeleted
        ? this.plantReadRepository.findById(idOrSlug, readOptions)
        : this.plantReadRepository.findActiveById(idOrSlug, readOptions);
    }
    return canSeeDeleted
      ? this.plantReadRepository.findBySlug(idOrSlug, readOptions)
      : this.plantReadRepository.findActiveBySlug(idOrSlug, readOptions);
  }
}

const stripLikesCount = (view: PlantSparseView): PlantSparseView => {
  const { likesCount: _likesCount, ...rest } = view;
  return rest;
};
