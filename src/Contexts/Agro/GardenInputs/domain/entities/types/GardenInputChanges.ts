import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type { GardenInputAction } from './GardenInputAction.js';
import type { GardenInputCategory } from './GardenInputCategory.js';
import type { GardenInputRecipePrimitives } from './GardenInputRecipePrimitives.js';

export type GardenInputChanges = {
  name?: string;
  description?: string | null;
  category?: GardenInputCategory;
  actions?: GardenInputAction[] | null;
  activeIngredients?: string[] | null;
  nutrients?: string[] | null;
  targets?: string[] | null;
  recipes?: GardenInputRecipePrimitives[] | null;
  resources?: SupportResourcePrimitives[] | null;
};
