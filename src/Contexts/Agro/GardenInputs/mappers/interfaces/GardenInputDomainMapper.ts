import type { GardenInput } from '../../domain/entities/GardenInput.js';
import type { GardenInputPrimitives } from '../../domain/entities/types/GardenInputPrimitives.js';

export interface GardenInputDomainMapper {
  toPrimitives(gardenInput: GardenInput): GardenInputPrimitives;
  fromPrimitives(primitives: GardenInputPrimitives): GardenInput;
}
