import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { PlantReadRepository } from '../../../Plants/application/queries/index.js';
import { createPlantId } from '../../../Plants/domain/PlantId.js';
import { PlantRelation } from '../../domain/entities/PlantRelation.js';
import { createPlantRelationId } from '../../domain/PlantRelationId.js';
import type { PlantRelationRepository } from '../../domain/repositories/interfaces/PlantRelationRepository.js';
import { ProximityDistance } from '../../domain/valueObjects/ProximityDistance.js';
import type { CreatePlantRelationDto } from './interfaces/CreatePlantRelationDto.js';

export type CreatePlantRelationDependencies = {
  plantRelationRepository: PlantRelationRepository;
  plantReadRepository: PlantReadRepository;
};

export class CreatePlantRelation {
  private readonly plantRelationRepository: PlantRelationRepository;
  private readonly plantReadRepository: PlantReadRepository;

  constructor({
    plantRelationRepository,
    plantReadRepository
  }: CreatePlantRelationDependencies) {
    this.plantRelationRepository = plantRelationRepository;
    this.plantReadRepository = plantReadRepository;
  }

  async execute(
    dto: CreatePlantRelationDto,
    user: string
  ): Promise<PlantRelation> {
    if (dto.sourcePlantId === dto.targetPlantId) {
      throw new InvalidArgumentException(
        '<PlantRelation> sourcePlantId and targetPlantId must be distinct'
      );
    }

    const [sourcePlant, targetPlant] = await Promise.all([
      this.plantReadRepository.findActiveById(dto.sourcePlantId),
      this.plantReadRepository.findActiveById(dto.targetPlantId)
    ]);

    if (!sourcePlant) {
      throw new InvalidArgumentException(
        `<PlantRelation> sourcePlantId '${dto.sourcePlantId}' does not exist or is not active`
      );
    }

    if (!targetPlant) {
      throw new InvalidArgumentException(
        `<PlantRelation> targetPlantId '${dto.targetPlantId}' does not exist or is not active`
      );
    }

    const proximity = ProximityDistance.create(
      dto.proximity.minDistanceCm,
      dto.proximity.maxDistanceCm
    );

    const plantRelation = PlantRelation.create({
      id: createPlantRelationId(dto.id),
      sourcePlantId: createPlantId(dto.sourcePlantId),
      targetPlantId: createPlantId(dto.targetPlantId),
      type: dto.type,
      mechanism: dto.mechanism,
      strength: dto.strength,
      proximity,
      reason: dto.reason,
      user
    });

    await this.plantRelationRepository.save(plantRelation);

    return plantRelation;
  }
}
