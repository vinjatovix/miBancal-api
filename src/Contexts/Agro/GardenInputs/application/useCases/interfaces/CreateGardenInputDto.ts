import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type {
  GardenInputAction,
  GardenInputCategory,
  GardenInputRecipePrimitives
} from '../../../domain/entities/types/index.js';

export interface CreateGardenInputDto {
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
}
