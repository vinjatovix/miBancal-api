import type { GardenInputChanges } from '../../../domain/entities/types/GardenInputChanges.js';

export interface UpdateGardenInputInput extends Partial<GardenInputChanges> {
  idOrSlug: string;
}
