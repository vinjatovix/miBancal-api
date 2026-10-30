import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { PlantReadRepository } from '../../../Plants/application/queries/index.js';
import { PlantRelation } from '../../domain/entities/PlantRelation.js';
import { createPlantRelationId } from '../../domain/PlantRelationId.js';
import type { PlantRelationRepository } from '../../domain/repositories/interfaces/PlantRelationRepository.js';
import { ProximityDistance } from '../../domain/valueObjects/ProximityDistance.js';
import { TaxonomicScope } from '../../domain/valueObjects/TaxonomicScope.js';
import type { TaxonomicScopePrimitives } from '../../domain/valueObjects/types/TaxonomicScopePrimitives.js';
import type { FamilySummaryReader } from '../queries/FamilySummaryReader.js';
import type { CreatePlantRelationDto } from './interfaces/CreatePlantRelationDto.js';

export type CreatePlantRelationDependencies = {
  plantRelationRepository: PlantRelationRepository;
  plantReadRepository: PlantReadRepository;
  familySummaryReader: FamilySummaryReader;
};

export class CreatePlantRelation {
  private readonly plantRelationRepository: PlantRelationRepository;
  private readonly plantReadRepository: PlantReadRepository;
  private readonly familySummaryReader: FamilySummaryReader;

  constructor({
    plantRelationRepository,
    plantReadRepository,
    familySummaryReader
  }: CreatePlantRelationDependencies) {
    this.plantRelationRepository = plantRelationRepository;
    this.plantReadRepository = plantReadRepository;
    this.familySummaryReader = familySummaryReader;
  }

  async execute(
    dto: CreatePlantRelationDto,
    user: string
  ): Promise<PlantRelation> {
    const source = this.resolveParticipant(
      'source' in dto ? dto.source : undefined,
      'sourcePlantId' in dto ? dto.sourcePlantId : undefined
    );
    const target = this.resolveParticipant(
      'target' in dto ? dto.target : undefined,
      'targetPlantId' in dto ? dto.targetPlantId : undefined
    );

    if (!source || !target) {
      throw new InvalidArgumentException(
        '<PlantRelation> source and target are required'
      );
    }

    this.ensureValidParticipants(source, target);

    await this.validateReferentialIntegrity(source, target);

    const proximity = ProximityDistance.create(
      dto.proximity.minDistanceCm,
      dto.proximity.maxDistanceCm
    );

    const plantRelation = PlantRelation.create({
      id: createPlantRelationId(dto.id),
      source,
      target,
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

  private resolveParticipant(
    scope: TaxonomicScopePrimitives | undefined,
    plantId: string | undefined
  ): TaxonomicScope | undefined {
    if (scope) return TaxonomicScope.fromPrimitives(scope);

    return plantId ? TaxonomicScope.plant(plantId) : undefined;
  }

  private ensureValidParticipants(
    source: TaxonomicScope,
    target: TaxonomicScope
  ): void {
    if (source.isAll()) {
      throw new InvalidArgumentException(
        '<PlantRelation> source scope cannot be broadcast "all"'
      );
    }

    if (
      source.scope === target.scope &&
      source.value !== undefined &&
      target.value !== undefined &&
      source.value.toLowerCase() === target.value.toLowerCase()
    ) {
      throw new InvalidArgumentException(
        '<PlantRelation> source and target participants must be distinct'
      );
    }
  }

  private async validateReferentialIntegrity(
    source: TaxonomicScope,
    target: TaxonomicScope
  ): Promise<void> {
    await this.ensureParticipantExists('source', source);
    await this.ensureParticipantExists('target', target);
  }

  private async ensureParticipantExists(
    role: 'source' | 'target',
    scope: TaxonomicScope
  ): Promise<void> {
    if (!scope.value) return;

    if (scope.isPlant()) {
      const plant = await this.plantReadRepository.findActiveById(scope.value);
      if (!plant) {
        throw new InvalidArgumentException(
          `<PlantRelation> ${role} plant '${scope.value}' does not exist or is not active`
        );
      }
    }

    if (scope.isFamily()) {
      const family = await this.familySummaryReader.findById(scope.value);
      if (!family) {
        throw new InvalidArgumentException(
          `<PlantRelation> ${role} family '${scope.value}' does not exist`
        );
      }
    }
  }
}
