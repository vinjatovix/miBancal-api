import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import type { AnomalyReadRepository } from '../../../Anomalies/application/queries/index.js';
import type { FamilyRepository } from '../../../Families/domain/repositories/interfaces/FamilyRepository.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantInputMapper } from '../../mappers/plantInputMapper.js';
import { ensureAnomaliesExist } from './ensureAnomaliesExist.js';
import type { CreatePlantDto } from './interfaces/CreatePlantDto.js';

export type CreatePlantDependencies = {
  plantRepository: PlantRepository;
  familyRepository: FamilyRepository;
  anomalyReadRepository: AnomalyReadRepository;
  cacheRepository: CacheRepository;
};

export class CreatePlant {
  private readonly plantRepository: PlantRepository;
  private readonly familyRepository: FamilyRepository;
  private readonly anomalyReadRepository: AnomalyReadRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({
    plantRepository,
    familyRepository,
    anomalyReadRepository,
    cacheRepository
  }: CreatePlantDependencies) {
    this.plantRepository = plantRepository;
    this.familyRepository = familyRepository;
    this.anomalyReadRepository = anomalyReadRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(dto: CreatePlantDto, user = 'system'): Promise<Plant> {
    const exists = await this.plantRepository.exists(dto.id);

    if (exists) {
      throw new DomainConflictException(`Plant already exists: ${dto.id}`);
    }
    const familyExists = await this.familyRepository.exists(
      dto.identity.family
    );

    if (!familyExists) {
      throw new InvalidArgumentException(
        `Family with id ${dto.identity.family} does not exist`
      );
    }

    await ensureAnomaliesExist(this.anomalyReadRepository, dto.anomalies);

    const plant = plantInputMapper.fromCreateDto(dto, user);

    await this.plantRepository.save(plant);

    await this.cacheRepository.delete(catalogIdKey('plants', plant.id));
    await this.cacheRepository.delete(
      catalogSlugKey('plants', plant.identity.slug)
    );
    await this.cacheRepository.bumpGeneration(catalogNamespace('plants'));

    return plant;
  }
}
