import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { AnomalyRepository } from '../../domain/repositories/interfaces/AnomalyRepository.js';
import { anomalyDomainMapper } from '../../mappers/anomalyDomainMapper.js';

export type DeleteAnomalyDependencies = {
  anomalyRepository: AnomalyRepository;
};

export class DeleteAnomaly {
  private readonly anomalyRepository: AnomalyRepository;

  constructor({ anomalyRepository }: DeleteAnomalyDependencies) {
    this.anomalyRepository = anomalyRepository;
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
  }

  /** One read of the active aggregate, by id when the key is a UUID, else by slug. */
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
