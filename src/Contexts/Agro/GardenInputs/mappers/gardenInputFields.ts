import type { SupportResourcePrimitives } from '../../shared/domain/supportResource/index.js';
import type {
  GardenInputAction,
  GardenInputRecipePrimitives
} from '../domain/entities/types/index.js';

export type GardenInputFieldSource = {
  description?: string | undefined;
  actions?: GardenInputAction[] | undefined;
  activeIngredients?: string[] | undefined;
  nutrients?: string[] | undefined;
  targets?: string[] | undefined;
  recipes?: GardenInputRecipePrimitives[] | undefined;
  resources?: SupportResourcePrimitives[] | undefined;
};

export type DefinedGardenInputFields = {
  description?: string;
  actions?: GardenInputAction[];
  activeIngredients?: string[];
  nutrients?: string[];
  targets?: string[];
  recipes?: GardenInputRecipePrimitives[];
  resources?: SupportResourcePrimitives[];
};

export const definedGardenInputFields = (
  source: GardenInputFieldSource
): DefinedGardenInputFields => {
  const result: DefinedGardenInputFields = {};

  if (source.description !== undefined) result.description = source.description;
  if (source.actions !== undefined) result.actions = source.actions;
  if (source.activeIngredients !== undefined) {
    result.activeIngredients = source.activeIngredients;
  }
  if (source.nutrients !== undefined) result.nutrients = source.nutrients;
  if (source.targets !== undefined) result.targets = source.targets;
  if (source.recipes !== undefined) result.recipes = source.recipes;
  if (source.resources !== undefined) result.resources = source.resources;

  return result;
};
