import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { AnomalyRepository } from '../../domain/repositories/interfaces/AnomalyRepository.js';
import { anomalyDomainMapper } from '../../mappers/anomalyDomainMapper.js';

export type DeleteAnomalyDependencies = {
  anomalyRepository: AnomalyRepository;
  cacheRepository: CacheRepository;
};

export class DeleteAnomaly {
  private readonly anomalyRepository: AnomalyRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({
    anomalyRepository,
    cacheRepository
  }: DeleteAnomalyDependencies) {
    this.anomalyRepository = anomalyRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(
    idOrSlug: string,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const anomaly = await this.findAnomaly(idOrSlug);

    ensureVersion(
      anomaly.version,
      expectedVersions,
      'Anomaly',
      anomaly.idValue
    );

    const current = anomalyDomainMapper.toPrimitives(anomaly);
    anomaly.markAsDeleted(user);
    const deleted = anomalyDomainMapper.toPrimitives(anomaly);

    await this.anomalyRepository.updateWithDiff(current, deleted);

    await this.cacheRepository.delete(
      catalogIdKey('anomalies', anomaly.idValue)
    );
    await this.cacheRepository.delete(
      catalogSlugKey('anomalies', anomaly.slug)
    );
    await this.cacheRepository.bumpGeneration(catalogNamespace('anomalies'));
  }

  private async findAnomaly(idOrSlug: string): Promise<Anomaly> {
    if (UuidValidator.isValid(idOrSlug)) {
      return ensureFound(
        await this.anomalyRepository.findActiveById(idOrSlug),
        'Anomaly',
        idOrSlug
      );
    }

    return ensureFound(
      await this.anomalyRepository.findActiveBySlug(idOrSlug),
      'Anomaly',
      idOrSlug,
      'slug'
    );
  }
}
