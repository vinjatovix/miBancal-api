import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
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
};

export class ListAnomalies {
  private readonly anomalyReadRepository: AnomalyReadRepository;

  constructor({ anomalyReadRepository }: ListAnomaliesDependencies) {
    this.anomalyReadRepository = anomalyReadRepository;
  }

  async execute(
    user: UserSessionInfo | undefined,
    dto?: ListAnomaliesDto
  ): Promise<PaginatedResult<AnomalySparseView>> {
    const query = dto?.query ?? {};
    const userFilters = query.filter ?? {};

    // Non-privileged readers never see soft-deleted anomalies.
    const filter: AnomalyFilter = canSeeDeletedAnomalies(user)
      ? userFilters
      : { ...userFilters, status: { eq: AnomalyStatus.ACTIVE } };

    return this.anomalyReadRepository.findAll({ ...query, filter });
  }
}
