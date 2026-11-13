import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import {
  cacheAside,
  catalogListKey,
  catalogNamespace,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import type { GardenInputFilter } from '../../domain/entities/types/GardenInputFilter.js';
import type {
  GardenInputReadRepository,
  GardenInputSparseView
} from '../queries/index.js';
import { canSeeDeletedGardenInputs } from './canSeeDeletedGardenInputs.js';
import type { ListGardenInputsDto } from './interfaces/ListGardenInputsDto.js';

export type ListGardenInputsDependencies = {
  gardenInputReadRepository: GardenInputReadRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class ListGardenInputs {
  private readonly gardenInputReadRepository: GardenInputReadRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    gardenInputReadRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: ListGardenInputsDependencies) {
    this.gardenInputReadRepository = gardenInputReadRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    user: UserSessionInfo | undefined,
    dto?: ListGardenInputsDto
  ): Promise<PaginatedResult<GardenInputSparseView>> {
    const query = dto?.query ?? {};
    const userFilters = query.filter ?? {};
    const isPrivilegedRead = canSeeDeletedGardenInputs(user);

    if (isPrivilegedRead) {
      return this.gardenInputReadRepository.findAll({
        ...query,
        filter: userFilters
      });
    }

    const filter: GardenInputFilter = {
      ...userFilters,
      status: { eq: 'active' }
    };
    const effectiveQuery = { ...query, filter };
    const generation = await this.cacheRepository.currentGeneration(
      catalogNamespace('gardenInputs')
    );
    const key = catalogListKey('gardenInputs', generation, effectiveQuery);

    return cacheAside(
      this.cacheRepository,
      key,
      this.cacheCatalogTtlSeconds,
      () => this.gardenInputReadRepository.findAll(effectiveQuery)
    );
  }
}
