import type { Metadata } from '../../../../../shared/domain/valueObject/Metadata.js';
import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type { GardenInputId } from '../../GardenInputId.js';
import type { GardenInputAction } from './GardenInputAction.js';
import type { GardenInputCategory } from './GardenInputCategory.js';
import type { GardenInputRecipePrimitives } from './GardenInputRecipePrimitives.js';
import type { GardenInputStatus } from './GardenInputStatus.js';

export type GardenInputProps = {
  id: GardenInputId;
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
  status?: GardenInputStatus;
  deletedAt?: Date;
  metadata: Metadata;
  version?: number;
};
