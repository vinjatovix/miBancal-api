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
};

export class CreateAnomaly {
  private readonly anomalyRepository: AnomalyRepository;
  private readonly anomalyReadRepository: AnomalyReadRepository;

  constructor({
    anomalyRepository,
    anomalyReadRepository
  }: CreateAnomalyDependencies) {
    this.anomalyRepository = anomalyRepository;
    this.anomalyReadRepository = anomalyReadRepository;
  }

  async execute(dto: CreateAnomalyDto, user: string): Promise<Anomaly> {
    const exists = await this.anomalyRepository.exists(dto.id);

    if (exists) {
      throw new DomainConflictException(`Anomaly already exists: ${dto.id}`);
    }

    // Non-transactional pre-check: every confusedWith slug must already exist
    // (ACTIVE); an unknown slug rejects the write before any persistence.
    await ensureConfusedWithExist(
      this.anomalyReadRepository,
      dto.confusedWith,
      dto.slug
    );

    const anomaly = anomalyInputMapper.fromCreateDto(dto, user);

    // A duplicate slug surfaces as a Mongo duplicate-key error mapped to 409.
    await this.anomalyRepository.save(anomaly);

    return anomaly;
  }
}
