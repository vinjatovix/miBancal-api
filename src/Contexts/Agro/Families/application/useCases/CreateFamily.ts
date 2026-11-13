import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type { Family } from '../../domain/entities/Family.js';
import type { FamilyRepository } from '../../domain/repositories/interfaces/FamilyRepository.js';
import { familyInputMapper } from '../../mappers/familyInputMapper.js';
import type { CreateFamilyDto } from './interfaces/CreateFamilyDto.js';

export type CreateFamilyDependencies = {
  familyRepository: FamilyRepository;
  cacheRepository: CacheRepository;
};

export class CreateFamily {
  private readonly familyRepository: FamilyRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({ familyRepository, cacheRepository }: CreateFamilyDependencies) {
    this.familyRepository = familyRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(dto: CreateFamilyDto, user: string): Promise<Family> {
    const exists = await this.familyRepository.exists(dto.id);

    if (exists) {
      throw new DomainConflictException(`Family already exists: ${dto.id}`);
    }

    const family = familyInputMapper.fromCreateDto(dto, user);

    await this.familyRepository.save(family);

    await this.cacheRepository.delete(catalogIdKey('families', family.idValue));
    await this.cacheRepository.delete(catalogSlugKey('families', family.slug));
    await this.cacheRepository.bumpGeneration(catalogNamespace('families'));

    return family;
  }
}
