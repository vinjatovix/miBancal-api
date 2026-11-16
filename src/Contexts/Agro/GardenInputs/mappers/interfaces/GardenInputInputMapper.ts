import type { CreateGardenInputDto } from '../../application/useCases/interfaces/CreateGardenInputDto.js';
import type { GardenInput } from '../../domain/entities/GardenInput.js';
import type { GardenInputChanges } from '../../domain/entities/types/GardenInputChanges.js';

export interface GardenInputInputMapper {
  fromCreateDto(dto: CreateGardenInputDto, user: string): GardenInput;
  toChanges(input: Partial<GardenInputChanges>): GardenInputChanges;
}
