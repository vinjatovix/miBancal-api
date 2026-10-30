import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { DomainStaleVersionException } from '../../../../shared/domain/errors/index.js';
import type { PlantRelationRepository } from '../../domain/repositories/interfaces/PlantRelationRepository.js';

export type DeletePlantRelationDependencies = {
  plantRelationRepository: PlantRelationRepository;
};

export class DeletePlantRelation {
  private readonly plantRelationRepository: PlantRelationRepository;

  constructor({ plantRelationRepository }: DeletePlantRelationDependencies) {
    this.plantRelationRepository = plantRelationRepository;
  }

  async execute(
    id: string,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const existingRelation = ensureFound(
      await this.plantRelationRepository.findById(id),
      'PlantRelation',
      id
    );

    ensureVersion(
      existingRelation.version,
      expectedVersions,
      'PlantRelation',
      id
    );

    const wasDeleted = await this.plantRelationRepository.delete(
      id,
      existingRelation.version
    );

    if (!wasDeleted) {
      throw new DomainStaleVersionException(
        `PlantRelation version mismatch: ${id}`
      );
    }
  }
}
