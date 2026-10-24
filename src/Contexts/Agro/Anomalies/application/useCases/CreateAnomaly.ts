import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { AnomalyRepository } from '../../domain/repositories/interfaces/AnomalyRepository.js';
import { anomalyInputMapper } from '../../mappers/anomalyInputMapper.js';
import type { CreateAnomalyDto } from './interfaces/CreateAnomalyDto.js';

export type CreateAnomalyDependencies = {
  anomalyRepository: AnomalyRepository;
};

export class CreateAnomaly {
  private readonly anomalyRepository: AnomalyRepository;

  constructor({ anomalyRepository }: CreateAnomalyDependencies) {
    this.anomalyRepository = anomalyRepository;
  }

  async execute(dto: CreateAnomalyDto, user: string): Promise<Anomaly> {
    const exists = await this.anomalyRepository.exists(dto.id);

    if (exists) {
      throw new DomainConflictException(`Anomaly already exists: ${dto.id}`);
    }

    const anomaly = anomalyInputMapper.fromCreateDto(dto, user);

    // A duplicate slug surfaces as a Mongo duplicate-key error mapped to 409.
    await this.anomalyRepository.save(anomaly);

    return anomaly;
  }
}
