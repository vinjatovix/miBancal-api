import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type { SupportResourcePrimitives } from '../../../shared/domain/supportResource/index.js';
import type {
  GardenInputAction,
  GardenInputCategory,
  GardenInputRecipePrimitives,
  GardenInputStatus
} from '../../domain/entities/types/index.js';

export type GardenInputReadView = {
  readonly id: string;
  readonly version: number;
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly category: GardenInputCategory;
  readonly actions?: GardenInputAction[];
  readonly activeIngredients?: string[];
  readonly nutrients?: string[];
  readonly targets?: string[];
  readonly recipes?: GardenInputRecipePrimitives[];
  readonly resources?: SupportResourcePrimitives[];
  readonly status: GardenInputStatus;
  readonly deletedAt?: string;
  readonly metadata: MetadataPrimitives;
};

export const GARDEN_INPUT_FIELDS = [
  'id',
  'slug',
  'name',
  'description',
  'category',
  'actions',
  'activeIngredients',
  'nutrients',
  'targets',
  'recipes',
  'resources',
  'status',
  'deletedAt',
  'metadata',
  'version'
] as const satisfies readonly (keyof GardenInputReadView)[];

export type GardenInputField = (typeof GARDEN_INPUT_FIELDS)[number];

export type GardenInputSparseView = Pick<GardenInputReadView, 'id'> &
  Partial<Omit<GardenInputReadView, 'id'>>;
