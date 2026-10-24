import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { AnomalyRepository } from '../../domain/repositories/interfaces/AnomalyRepository.js';
import { anomalyDomainMapper } from '../../mappers/anomalyDomainMapper.js';
import { anomalyInputMapper } from '../../mappers/anomalyInputMapper.js';
import type { UpdateAnomalyInput } from './interfaces/UpdateAnomalyInput.js';

export type UpdateAnomalyDependencies = {
  anomalyRepository: AnomalyRepository;
};

export class UpdateAnomaly {
  private readonly anomalyRepository: AnomalyRepository;

  constructor({ anomalyRepository }: UpdateAnomalyDependencies) {
    this.anomalyRepository = anomalyRepository;
  }

  async execute(
    input: UpdateAnomalyInput,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<Anomaly> {
    const anomaly = await this.findAnomaly(input.idOrSlug);

    ensureVersion(
      anomaly.version,
      expectedVersions,
      'Anomaly',
      anomaly.idValue
    );

    const changes = anomalyInputMapper.toChanges(input);
    const before = anomalyDomainMapper.toPrimitives(anomaly);

    anomaly.updateGuidance(changes, user);

    const after = anomalyDomainMapper.toPrimitives(anomaly);

    // Always called: an empty diff is still confirmed against storage.
    anomaly.syncVersion(
      await this.anomalyRepository.updateWithDiff(before, after)
    );

    return anomaly;
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
