import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { AnomalyRepository } from '../../domain/repositories/interfaces/AnomalyRepository.js';
import { anomalyInputMapper } from '../../mappers/anomalyInputMapper.js';
import type { AnomalyReadRepository } from '../queries/index.js';
import { ensureConfusedWithExist } from './ensureConfusedWithExist.js';
import type { CreateAnomalyDto } from './interfaces/CreateAnomalyDto.js';

export type CreateAnomalyDependencies = {
  anomalyRepository: AnomalyRepository;
  anomalyReadRepository: AnomalyReadRepository;
  cacheRepository: CacheRepository;
};

export class CreateAnomaly {
  private readonly anomalyRepository: AnomalyRepository;
  private readonly anomalyReadRepository: AnomalyReadRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({
    anomalyRepository,
    anomalyReadRepository,
    cacheRepository
  }: CreateAnomalyDependencies) {
    this.anomalyRepository = anomalyRepository;
    this.anomalyReadRepository = anomalyReadRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(dto: CreateAnomalyDto, user: string): Promise<Anomaly> {
    const exists = await this.anomalyRepository.exists(dto.id);

    if (exists) {
      throw new DomainConflictException(`Anomaly already exists: ${dto.id}`);
    }

    await ensureConfusedWithExist(
      this.anomalyReadRepository,
      dto.confusedWith,
      dto.slug
    );

    const anomaly = anomalyInputMapper.fromCreateDto(dto, user);

    await this.anomalyRepository.save(anomaly);

    await this.cacheRepository.delete(
      catalogIdKey('anomalies', anomaly.idValue)
    );
    await this.cacheRepository.delete(
      catalogSlugKey('anomalies', anomaly.slug)
    );
    await this.cacheRepository.bumpGeneration(catalogNamespace('anomalies'));

    return anomaly;
  }
}
