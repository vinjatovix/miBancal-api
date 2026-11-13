import {
  catalogIdKey,
  catalogNamespace,
  catalogSlugKey,
  type CacheRepository
} from '../../../../shared/application/cache/index.js';
import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type { GardenInput } from '../../domain/entities/GardenInput.js';
import type { GardenInputRepository } from '../../domain/repositories/interfaces/GardenInputRepository.js';
import { gardenInputInputMapper } from '../../mappers/gardenInputInputMapper.js';
import type { CreateGardenInputDto } from './interfaces/CreateGardenInputDto.js';

export type CreateGardenInputDependencies = {
  gardenInputRepository: GardenInputRepository;
  cacheRepository: CacheRepository;
};

export class CreateGardenInput {
  private readonly gardenInputRepository: GardenInputRepository;
  private readonly cacheRepository: CacheRepository;

  constructor({
    gardenInputRepository,
    cacheRepository
  }: CreateGardenInputDependencies) {
    this.gardenInputRepository = gardenInputRepository;
    this.cacheRepository = cacheRepository;
  }

  async execute(dto: CreateGardenInputDto, user: string): Promise<GardenInput> {
    const exists = await this.gardenInputRepository.exists(dto.id);
    if (exists) {
      throw new DomainConflictException(
        `GardenInput already exists: ${dto.id}`
      );
    }

    const existingSlug = await this.gardenInputRepository.findBySlug(dto.slug);
    if (existingSlug) {
      throw new DomainConflictException(
        `GardenInput slug already exists: ${dto.slug}`
      );
    }

    const gardenInput = gardenInputInputMapper.fromCreateDto(dto, user);
    await this.gardenInputRepository.save(gardenInput);

    await this.cacheRepository.delete(
      catalogIdKey('gardenInputs', gardenInput.idValue)
    );
    await this.cacheRepository.delete(
      catalogSlugKey('gardenInputs', gardenInput.slug)
    );
    await this.cacheRepository.bumpGeneration(catalogNamespace('gardenInputs'));

    return gardenInput;
  }
}
