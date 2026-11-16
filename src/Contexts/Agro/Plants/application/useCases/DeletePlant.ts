import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../mappers/plantDomainMapper.js';

export type DeletePlantDependencies = {
  plantRepository: PlantRepository;
  cacheRepository: CacheRepository;
};

export class DeletePlant {
  private readonly plantRepository: PlantRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({ plantRepository, cacheRepository }: DeletePlantDependencies) {
    this.plantRepository = plantRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(
    id: string,
    username: string,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const plant = ensureFound(
      await this.plantRepository.findActiveById(id),
      'Plant',
      id
    );
    ensureVersion(plant.version, expectedVersions, 'Plant', id);

    const current = plantDomainMapper.toPrimitives(plant);
    plant.markAsDeleted(username);
    const deleted = plantDomainMapper.toPrimitives(plant);

    await this.plantRepository.updateWithDiff(current, deleted);

    await this.cacheRepository.delete(catalogIdKey('plants', plant.id));
    await this.cacheRepository.delete(
      catalogSlugKey('plants', plant.identity.slug)
    );
    await this.cacheRepository.bumpGeneration(catalogNamespace('plants'));
  }
}
