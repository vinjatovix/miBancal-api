import { z } from 'zod';

import type { GardenInputField } from '../../../../Contexts/Agro/GardenInputs/application/queries/GardenInputReadView.js';
import {
  GARDEN_INPUT_ACTIONS,
  GARDEN_INPUT_CATEGORIES,
  GARDEN_INPUT_DOSAGE_METHODS
} from '../../../../Contexts/Agro/GardenInputs/domain/entities/types/index.js';
import { SUPPORT_RESOURCE_TYPES } from '../../../../Contexts/Agro/shared/domain/supportResource/index.js';
import {
  listSchema,
  REQUEST_LIMITS,
  shortTextSchema
} from '../../shared/requestSchemas.js';
import {
  fieldsetMask,
  metadataResponseSchema,
  requiredLongTextResponseSchema,
  requiredShortTextResponseSchema
} from '../../shared/responseSchemas.js';

const resourceUrlSchema = z
  .string()
  .max(REQUEST_LIMITS.url)
  .regex(/^https?:\/\//);

const supportResourceResponseSchema = z.object({
  type: z.enum(SUPPORT_RESOURCE_TYPES),
  url: resourceUrlSchema,
  title: shortTextSchema.exactOptional(),
  source: shortTextSchema.exactOptional(),
  tags: listSchema(shortTextSchema).exactOptional()
});

const ingredientResponseSchema = z.object({
  item: requiredShortTextResponseSchema,
  quantity: requiredShortTextResponseSchema
});

const dosageResponseSchema = z.object({
  method: z.enum(GARDEN_INPUT_DOSAGE_METHODS),
  dilution: requiredShortTextResponseSchema,
  frequency: requiredShortTextResponseSchema
});

const storageResponseSchema = z.object({
  duration: requiredShortTextResponseSchema,
  conditions: requiredShortTextResponseSchema,
  spoilageSigns: shortTextSchema.exactOptional()
});

const recipeResponseSchema = z.object({
  name: requiredShortTextResponseSchema,
  description: requiredLongTextResponseSchema.exactOptional(),
  ingredients: listSchema(ingredientResponseSchema),
  instructions: listSchema(requiredLongTextResponseSchema),
  brewTime: shortTextSchema.exactOptional(),
  dosage: dosageResponseSchema,
  storage: storageResponseSchema.exactOptional(),
  safetyNotes: listSchema(requiredLongTextResponseSchema).exactOptional()
});

export const gardenInputResponseSchema = z.object({
  id: z.string().min(1).max(REQUEST_LIMITS.shortText),
  version: z.number().int().min(0),
  slug: requiredShortTextResponseSchema,
  name: requiredShortTextResponseSchema,
  description: requiredLongTextResponseSchema.exactOptional(),
  category: z.enum(GARDEN_INPUT_CATEGORIES),
  actions: listSchema(z.enum(GARDEN_INPUT_ACTIONS)).exactOptional(),
  activeIngredients: listSchema(shortTextSchema).exactOptional(),
  nutrients: listSchema(shortTextSchema).exactOptional(),
  targets: listSchema(shortTextSchema).exactOptional(),
  recipes: listSchema(recipeResponseSchema).exactOptional(),
  resources: listSchema(supportResourceResponseSchema).exactOptional(),
  status: z.enum(['active', 'deleted']),
  deletedAt: z.iso.datetime().exactOptional(),
  metadata: metadataResponseSchema
});

export type GardenInputResponse = z.output<typeof gardenInputResponseSchema>;

export type GardenInputFieldsetResponse = Pick<GardenInputResponse, 'id'> &
  Partial<Omit<GardenInputResponse, 'id'>>;

export const gardenInputFieldsetResponseSchema = (
  fields?: readonly GardenInputField[]
): z.ZodType<GardenInputFieldsetResponse> =>
  fields === undefined
    ? gardenInputResponseSchema
    : gardenInputResponseSchema.pick(fieldsetMask(fields));
