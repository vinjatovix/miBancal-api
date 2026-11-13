import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import {
  cacheAside,
  catalogListKey,
  catalogNamespace,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import type { AnomalyFilter } from '../../domain/entities/types/AnomalyFilter.js';
import { AnomalyStatus } from '../../domain/entities/types/AnomalyStatus.js';
import type {
  AnomalyReadRepository,
  AnomalySparseView
} from '../queries/index.js';
import { canSeeDeletedAnomalies } from './canSeeDeletedAnomalies.js';
import type { ListAnomaliesDto } from './interfaces/ListAnomaliesDto.js';

export type ListAnomaliesDependencies = {
  anomalyReadRepository: AnomalyReadRepository;
  cacheRepository: CacheRepository;
  cacheCatalogTtlSeconds: number;
};

export class ListAnomalies {
  private readonly anomalyReadRepository: AnomalyReadRepository;
  private readonly cacheRepository: CacheRepository;
  private readonly cacheCatalogTtlSeconds: number;

  constructor({
    anomalyReadRepository,
    cacheRepository,
    cacheCatalogTtlSeconds
  }: ListAnomaliesDependencies) {
    this.anomalyReadRepository = anomalyReadRepository;
    this.cacheRepository = cacheRepository;
    this.cacheCatalogTtlSeconds = cacheCatalogTtlSeconds;
  }

  async execute(
    user: UserSessionInfo | undefined,
    dto?: ListAnomaliesDto
  ): Promise<PaginatedResult<AnomalySparseView>> {
    const query = dto?.query ?? {};
    const userFilters = query.filter ?? {};
    const isPrivilegedRead = canSeeDeletedAnomalies(user);

    if (isPrivilegedRead) {
      return this.anomalyReadRepository.findAll({
        ...query,
        filter: userFilters
      });
    }

    const filter: AnomalyFilter = {
      ...userFilters,
      status: { eq: AnomalyStatus.ACTIVE }
    };
    const effectiveQuery = { ...query, filter };
    const generation = await this.cacheRepository.currentGeneration(
      catalogNamespace('anomalies')
    );
    const key = catalogListKey('anomalies', generation, effectiveQuery);

    return cacheAside(
      this.cacheRepository,
      key,
      this.cacheCatalogTtlSeconds,
      () => this.anomalyReadRepository.findAll(effectiveQuery)
    );
  }
}
