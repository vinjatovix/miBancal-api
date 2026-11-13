import type { CreateBedInput } from '../../application/useCases/interfaces/CreateBedInput.js';
import type { UpdateBedInput } from '../../application/useCases/interfaces/UpdateBedInput.js';
import type { Bed } from '../../domain/entities/Bed.js';
import type { BedChanges } from '../../domain/entities/types/BedChanges.js';
import type { BedGeographicSnapshot } from '../../domain/entities/types/BedGeographicSnapshot.js';

export type { BedGeographicSnapshot };

export interface BedInputMapper {
  fromCreateInputToDomain(
    input: CreateBedInput,
    user: string,
    geo?: BedGeographicSnapshot
  ): Bed;
  toChanges(input: UpdateBedInput): BedChanges;
}
