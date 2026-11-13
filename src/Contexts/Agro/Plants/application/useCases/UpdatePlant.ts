import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';
import type { AnomalyReadRepository } from '../../../Anomalies/application/queries/index.js';
import type { FamilyRepository } from '../../../Families/domain/repositories/interfaces/FamilyRepository.js';
import type { Plant } from '../../domain/entities/Plant.js';
import type { PlantChanges } from '../../domain/entities/types/PlantChanges.js';
import type { PlantRepository } from '../../domain/repositories/interfaces/PlantRepository.js';
import { plantDomainMapper } from '../../mappers/plantDomainMapper.js';
import { plantInputMapper } from '../../mappers/plantInputMapper.js';
import { ensureAnomaliesExist } from './ensureAnomaliesExist.js';
import type { UpdatePlantDto } from './interfaces/UpdatePlantDto.js';

export type UpdatePlantInput = UpdatePlantDto & { id: string };

export type UpdatePlantDependencies = {
  plantRepository: PlantRepository;
  familyRepository: FamilyRepository;
  anomalyReadRepository: AnomalyReadRepository;
  cacheRepository: CacheRepository;
};

export class UpdatePlant {
  private readonly plantRepository: PlantRepository;
  private readonly familyRepository: FamilyRepository;
  private readonly anomalyReadRepository: AnomalyReadRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({
    plantRepository,
    familyRepository,
    anomalyReadRepository,
    cacheRepository
  }: UpdatePlantDependencies) {
    this.plantRepository = plantRepository;
    this.familyRepository = familyRepository;
    this.anomalyReadRepository = anomalyReadRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(
    input: UpdatePlantInput,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<Plant> {
    const plant = ensureFound(
      await this.plantRepository.findActiveById(input.id),
      'Plant',
      input.id
    );
    ensureVersion(plant.version, expectedVersions, 'Plant', input.id);

    const previousSlug = plant.identity.slug;
    const changes = plantInputMapper.toChanges(input);

    await this.ensureFamilyExists(plant, changes);
    await ensureAnomaliesExist(this.anomalyReadRepository, changes.anomalies);

    const before = plantDomainMapper.toPrimitives(plant);
    const at = new Date();

    if (changes.identity) plant.updateIdentity(changes.identity, user, at);
    if (changes.traits) plant.updateTraits(changes.traits, user, at);
    if (changes.phenology) plant.updatePhenology(changes.phenology, user, at);
    if (changes.knowledge) plant.updateKnowledge(changes.knowledge, user, at);
    if (changes.anomalies !== undefined)
      plant.updateAnomalies(changes.anomalies, user, at);

    const after = plantDomainMapper.toPrimitives(plant);

    plant.syncVersion(await this.plantRepository.updateWithDiff(before, after));

    await this.cacheRepository.delete(catalogIdKey('plants', plant.id));
    await this.cacheRepository.delete(catalogSlugKey('plants', previousSlug));
    if (plant.identity.slug !== previousSlug) {
      await this.cacheRepository.delete(
        catalogSlugKey('plants', plant.identity.slug)
      );
    }
    await this.cacheRepository.bumpGeneration(catalogNamespace('plants'));

    return plant;
  }

  private async ensureFamilyExists(
    plant: Plant,
    changes: PlantChanges
  ): Promise<void> {
    if (changes.identity?.family === undefined) return;

    const { family } = plant.identity.update(changes.identity);
    if (family === plant.identity.family) return;

    if (!(await this.familyRepository.exists(family))) {
      throw new InvalidArgumentException(
        `Family with id ${family} does not exist`
      );
    }
  }
}
