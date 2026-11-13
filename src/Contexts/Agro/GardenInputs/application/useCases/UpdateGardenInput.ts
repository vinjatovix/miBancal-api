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
import { gardenInputInputMapper } from '../../mappers/gardenInputInputMapper.js';
import type { UpdateGardenInputInput } from './interfaces/UpdateGardenInputInput.js';

export type UpdateGardenInputDependencies = {
  gardenInputRepository: GardenInputRepository;
  cacheRepository: CacheRepository;
};

export class UpdateGardenInput {
  private readonly gardenInputRepository: GardenInputRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({
    gardenInputRepository,
    cacheRepository
  }: UpdateGardenInputDependencies) {
    this.gardenInputRepository = gardenInputRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(
    input: UpdateGardenInputInput,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<GardenInput> {
    const gardenInput = await this.findGardenInput(input.idOrSlug);

    ensureVersion(
      gardenInput.version,
      expectedVersions,
      'GardenInput',
      gardenInput.idValue
    );

    const changes = gardenInputInputMapper.toChanges(input);
    const before = gardenInputDomainMapper.toPrimitives(gardenInput);

    gardenInput.updateDetails(changes, user);

    const after = gardenInputDomainMapper.toPrimitives(gardenInput);

    gardenInput.syncVersion(
      await this.gardenInputRepository.updateWithDiff(before, after)
    );

    await this.cacheRepository.delete(
      catalogIdKey('gardenInputs', gardenInput.idValue)
    );
    await this.cacheRepository.delete(
      catalogSlugKey('gardenInputs', gardenInput.slug)
    );
    await this.cacheRepository.bumpGeneration(catalogNamespace('gardenInputs'));

    return gardenInput;
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
