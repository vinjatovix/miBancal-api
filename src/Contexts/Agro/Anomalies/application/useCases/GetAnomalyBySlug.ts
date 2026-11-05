import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { UserSessionInfo } from '../../../../Auth/application/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type {
  AnomalyField,
  AnomalyReadRepository,
  AnomalySparseView
} from '../queries/index.js';
import { canSeeDeletedAnomalies } from './canSeeDeletedAnomalies.js';

export type GetAnomalyBySlugDependencies = {
  anomalyReadRepository: AnomalyReadRepository;
};

export class GetAnomalyBySlug {
  private readonly anomalyReadRepository: AnomalyReadRepository;

  constructor({ anomalyReadRepository }: GetAnomalyBySlugDependencies) {
    this.anomalyReadRepository = anomalyReadRepository;
  }

  async execute(
    idOrSlug: string,
    user: UserSessionInfo | undefined,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<AnomalySparseView> {
    const canSeeDeleted = canSeeDeletedAnomalies(user);
    const byId = UuidValidator.isValid(idOrSlug);

    const found = byId
      ? canSeeDeleted
        ? await this.anomalyReadRepository.findById(idOrSlug, options)
        : await this.anomalyReadRepository.findActiveById(idOrSlug, options)
      : canSeeDeleted
        ? await this.anomalyReadRepository.findBySlug(idOrSlug, options)
        : await this.anomalyReadRepository.findActiveBySlug(idOrSlug, options);

    return ensureFound(found, 'Anomaly', idOrSlug, byId ? undefined : 'slug');
  }
}
