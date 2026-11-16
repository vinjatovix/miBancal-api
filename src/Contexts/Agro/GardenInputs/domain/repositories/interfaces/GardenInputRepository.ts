import type { Nullable } from '../../../../../../shared/domain/types/Nullable.js';
import type { WriteOutcome } from '../../../../../shared/domain/repositories/WriteOutcome.js';
import type { GardenInput } from '../../entities/GardenInput.js';
import type { GardenInputPrimitives } from '../../entities/types/GardenInputPrimitives.js';

export interface GardenInputRepository {
  findById(id: string): Promise<Nullable<GardenInput>>;
  findActiveById(id: string): Promise<Nullable<GardenInput>>;
  findBySlug(slug: string): Promise<Nullable<GardenInput>>;
  findActiveBySlug(slug: string): Promise<Nullable<GardenInput>>;
  exists(id: string): Promise<boolean>;
  save(gardenInput: GardenInput): Promise<void>;
  updateWithDiff(
    current: GardenInputPrimitives,
    updated: GardenInputPrimitives
  ): Promise<WriteOutcome>;
}
