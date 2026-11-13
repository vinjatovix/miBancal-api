import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type { GardenInput } from '../../domain/entities/GardenInput.js';
import type { GardenInputRepository } from '../../domain/repositories/interfaces/GardenInputRepository.js';
import { gardenInputDomainMapper } from '../../mappers/gardenInputDomainMapper.js';

export type DeleteGardenInputDependencies = {
  gardenInputRepository: GardenInputRepository;
  cacheRepository: CacheRepository;
};

export class DeleteGardenInput {
  private readonly gardenInputRepository: GardenInputRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({
    gardenInputRepository,
    cacheRepository
  }: DeleteGardenInputDependencies) {
    this.gardenInputRepository = gardenInputRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(
    idOrSlug: string,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<void> {
    const gardenInput = await this.findGardenInput(idOrSlug);

    ensureVersion(
      gardenInput.version,
      expectedVersions,
      'GardenInput',
      gardenInput.idValue
    );

    const current = gardenInputDomainMapper.toPrimitives(gardenInput);
    gardenInput.markAsDeleted(user);
    const deleted = gardenInputDomainMapper.toPrimitives(gardenInput);

    await this.gardenInputRepository.updateWithDiff(current, deleted);

    await this.cacheRepository.delete(
      catalogIdKey('gardenInputs', gardenInput.idValue)
    );
    await this.cacheRepository.delete(
      catalogSlugKey('gardenInputs', gardenInput.slug)
    );
    await this.cacheRepository.bumpGeneration(catalogNamespace('gardenInputs'));
  }

  private async findGardenInput(idOrSlug: string): Promise<GardenInput> {
    if (UuidValidator.isValid(idOrSlug)) {
      return ensureFound(
        await this.gardenInputRepository.findActiveById(idOrSlug),
        'GardenInput',
        idOrSlug
      );
    }

    return ensureFound(
      await this.gardenInputRepository.findActiveBySlug(idOrSlug),
      'GardenInput',
      idOrSlug,
      'slug'
    );
  }
}
