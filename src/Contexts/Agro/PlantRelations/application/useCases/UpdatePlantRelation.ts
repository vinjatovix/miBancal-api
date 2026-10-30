import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { PlantRelation } from '../../domain/entities/PlantRelation.js';
import type { PlantRelationRepository } from '../../domain/repositories/interfaces/PlantRelationRepository.js';
import { ProximityDistance } from '../../domain/valueObjects/ProximityDistance.js';
import type { UpdatePlantRelationInput } from './interfaces/UpdatePlantRelationInput.js';

export type UpdatePlantRelationDependencies = {
  plantRelationRepository: PlantRelationRepository;
};

export class UpdatePlantRelation {
  private readonly plantRelationRepository: PlantRelationRepository;

  constructor({ plantRelationRepository }: UpdatePlantRelationDependencies) {
    this.plantRelationRepository = plantRelationRepository;
  }

  async execute(
    input: UpdatePlantRelationInput,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<PlantRelation> {
    const existingRelation = ensureFound(
      await this.plantRelationRepository.findById(input.id),
      'PlantRelation',
      input.id
    );

    ensureVersion(
      existingRelation.version,
      expectedVersions,
      'PlantRelation',
      input.id
    );

    const type = input.type !== undefined ? input.type : existingRelation.type;
    const mechanism =
      input.mechanism !== undefined
        ? input.mechanism
        : existingRelation.mechanism;
    const strength =
      input.strength !== undefined ? input.strength : existingRelation.strength;
    const reason =
      input.reason !== undefined ? input.reason : existingRelation.reason;
    const proximity =
      input.proximity !== undefined
        ? ProximityDistance.create(
            input.proximity.minDistanceCm,
            input.proximity.maxDistanceCm
          )
        : existingRelation.proximity;

    const previousVersion = existingRelation.version;

    existingRelation.updateParameters(
      {
        type,
        mechanism,
        strength,
        proximity,
        reason
      },
      user
    );

    if (existingRelation.version !== previousVersion) {
      await this.plantRelationRepository.save(existingRelation);
    }

    return existingRelation;
  }
}
