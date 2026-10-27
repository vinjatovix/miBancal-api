import { DomainConflictException } from '../../../../shared/domain/errors/index.js';
import type { GardenInput } from '../../domain/entities/GardenInput.js';
import type { GardenInputRepository } from '../../domain/repositories/interfaces/GardenInputRepository.js';
import { gardenInputInputMapper } from '../../mappers/gardenInputInputMapper.js';
import type { CreateGardenInputDto } from './interfaces/CreateGardenInputDto.js';

export type CreateGardenInputDependencies = {
  gardenInputRepository: GardenInputRepository;
};

export class CreateGardenInput {
  private readonly gardenInputRepository: GardenInputRepository;

  constructor({ gardenInputRepository }: CreateGardenInputDependencies) {
    this.gardenInputRepository = gardenInputRepository;
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

    return gardenInput;
  }
}
