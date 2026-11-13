import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { ensureFound } from '../../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../../shared/application/utils/ensureVersion.js';
import { UuidValidator } from '../../../../shared/domain/valueObject/index.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import { familyDomainMapper } from '../../mappers/familyDomainMapper.js';
import { familyInputMapper } from '../../mappers/familyInputMapper.js';
import type { UpdateFamilyInput } from './interfaces/UpdateFamilyInput.js';

export type UpdateFamilyDependencies = {
  familyRepository: FamilyRepository;
  cacheRepository: CacheRepository;
};

export class UpdateFamily {
  private readonly familyRepository: FamilyRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({ familyRepository, cacheRepository }: UpdateFamilyDependencies) {
    this.familyRepository = familyRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(
    input: UpdateFamilyInput,
    user: string,
    expectedVersions: readonly number[]
  ): Promise<Family> {
    const family = await this.findFamily(input.idOrSlug);

    ensureVersion(family.version, expectedVersions, 'Family', family.idValue);

    const previousSlug = family.slug;
    const changes = familyInputMapper.toChanges(input);
    const before = familyDomainMapper.toPrimitives(family);

    family.updateInformation(changes, user);

    const after = familyDomainMapper.toPrimitives(family);

    family.syncVersion(
      await this.familyRepository.updateWithDiff(before, after)
    );

    await this.cacheRepository.delete(catalogIdKey('families', family.idValue));
    await this.cacheRepository.delete(catalogSlugKey('families', previousSlug));
    if (family.slug !== previousSlug) {
      await this.cacheRepository.delete(
        catalogSlugKey('families', family.slug)
      );
    }
    await this.cacheRepository.bumpGeneration(catalogNamespace('families'));

    return family;
  }

  private async findFamily(idOrSlug: string): Promise<Family> {
    if (UuidValidator.isValid(idOrSlug)) {
      return ensureFound(
        await this.familyRepository.findById(idOrSlug),
        'Family',
        idOrSlug
      );
    }

    return ensureFound(
      await this.familyRepository.findBySlug(idOrSlug),
      'Family',
      idOrSlug,
      'slug'
    );
  }
}
