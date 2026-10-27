import type { Binary, UUID } from 'mongodb';
import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';
import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type {
  GardenInputAction,
  GardenInputCategory,
  GardenInputRecipePrimitives,
  GardenInputStatus
} from '../../../domain/entities/types/index.js';

export type MongoGardenInputDocument = {
  _id: string | Binary | UUID;
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
  deletedAt?: Date | string | null;
  metadata: MetadataPrimitives;
  version: number;
};
