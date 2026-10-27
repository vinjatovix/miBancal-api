import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type { GardenInputAction } from './GardenInputAction.js';
import type { GardenInputCategory } from './GardenInputCategory.js';
import type { GardenInputRecipePrimitives } from './GardenInputRecipePrimitives.js';
import type { GardenInputStatus } from './GardenInputStatus.js';

export type GardenInputPrimitives = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: GardenInputCategory;
  actions?: GardenInputAction[];
  activeIngredients?: string[];
  nutrients?: string[];
  targets?: string[];
  recipes?: GardenInputRecipePrimitives[];
  resources?: SupportResourcePrimitives[];
  status: GardenInputStatus;
  deletedAt?: string;
  metadata: MetadataPrimitives;
  version: number;
};
