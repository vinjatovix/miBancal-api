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
import { anomalyInputMapper } from '../../mappers/anomalyInputMapper.js';
import type { AnomalyReadRepository } from '../queries/index.js';
import { ensureConfusedWithExist } from './ensureConfusedWithExist.js';
import type { UpdateAnomalyInput } from './interfaces/UpdateAnomalyInput.js';

export type UpdateAnomalyDependencies = {
  anomalyRepository: AnomalyRepository;
  anomalyReadRepository: AnomalyReadRepository;
  cacheRepository: CacheRepository;
};

export class UpdateAnomaly {
  private readonly anomalyRepository: AnomalyRepository;
  private readonly anomalyReadRepository: AnomalyReadRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({
    anomalyRepository,
    anomalyReadRepository,
    cacheRepository
  }: UpdateAnomalyDependencies) {
    this.anomalyRepository = anomalyRepository;
    this.anomalyReadRepository = anomalyReadRepository;
    this.cacheRepository = cacheRepository;
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

    await ensureConfusedWithExist(
      this.anomalyReadRepository,
      changes.confusedWith,
      anomaly.slug
    );

    const before = anomalyDomainMapper.toPrimitives(anomaly);

    anomaly.updateGuidance(changes, user);

    const after = anomalyDomainMapper.toPrimitives(anomaly);

    anomaly.syncVersion(
      await this.anomalyRepository.updateWithDiff(before, after)
    );

    await this.cacheRepository.delete(
      catalogIdKey('anomalies', anomaly.idValue)
    );
    await this.cacheRepository.delete(
      catalogSlugKey('anomalies', anomaly.slug)
    );
    await this.cacheRepository.bumpGeneration(catalogNamespace('anomalies'));

    return anomaly;
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
