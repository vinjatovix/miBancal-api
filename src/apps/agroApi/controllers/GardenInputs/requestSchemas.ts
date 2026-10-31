import { z } from 'zod';

import {
  GARDEN_INPUT_FIELDS,
  type GardenInputField
} from '../../../../Contexts/Agro/GardenInputs/application/queries/GardenInputReadView.js';
import type { GardenInputFilter } from '../../../../Contexts/Agro/GardenInputs/domain/entities/types/GardenInputFilter.js';
import {
  GARDEN_INPUT_ACTIONS,
  GARDEN_INPUT_CATEGORIES,
  GARDEN_INPUT_DOSAGE_METHODS
} from '../../../../Contexts/Agro/GardenInputs/domain/entities/types/index.js';
import type { QueryOptions } from '../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import {
  enumField,
  exactField,
  fieldsetSchema,
  listQuerySchema,
  readQuerySchema,
  textItem
} from '../../shared/listQuerySchema.js';
import {
  emptyBody,
  emptyQuery,
  listSchema,
  requiredLongTextSchema,
  requiredShortTextSchema,
  supportResourceSchema,
  trimmedLongTextSchema,
  trimmedShortTextSchema
} from '../../shared/requestSchemas.js';

const gardenInputSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Expected a kebab-case slug'
  })
  .refine((value) => !z.uuid().safeParse(value).success, {
    message: 'A slug cannot have the shape of a UUID'
  });

const categorySchema = z.enum(GARDEN_INPUT_CATEGORIES);
const actionSchema = z.enum(GARDEN_INPUT_ACTIONS);
const dosageMethodSchema = z.enum(GARDEN_INPUT_DOSAGE_METHODS);

const ingredientInputSchema = z.object({
  item: requiredShortTextSchema,
  quantity: requiredShortTextSchema
});

const dosageInputSchema = z.object({
  method: dosageMethodSchema,
  dilution: requiredShortTextSchema,
  frequency: requiredShortTextSchema
});

const storageInputSchema = z.object({
  duration: requiredShortTextSchema,
  conditions: requiredShortTextSchema,
  spoilageSigns: trimmedShortTextSchema.exactOptional()
});

const recipeInputSchema = z.object({
  name: requiredShortTextSchema,
  description: trimmedLongTextSchema.exactOptional(),
  ingredients: listSchema(ingredientInputSchema).min(1),
  instructions: listSchema(requiredLongTextSchema).min(1),
  brewTime: trimmedShortTextSchema.exactOptional(),
  dosage: dosageInputSchema,
  storage: storageInputSchema.exactOptional(),
  safetyNotes: listSchema(requiredLongTextSchema).exactOptional()
});

const clearable = <T extends z.ZodType>(schema: T) =>
  schema.nullable().exactOptional();

const gardenInputIdOrSlugParams = z.object({
  idOrSlug: requiredShortTextSchema
});

const createGardenInputBody = z.object({
  id: z.uuid(),
  slug: gardenInputSlugSchema,
  name: requiredShortTextSchema,
  description: requiredLongTextSchema.exactOptional(),
  category: categorySchema,
  actions: listSchema(actionSchema).exactOptional(),
  activeIngredients: listSchema(requiredShortTextSchema).exactOptional(),
  nutrients: listSchema(requiredShortTextSchema).exactOptional(),
  targets: listSchema(requiredShortTextSchema).exactOptional(),
  recipes: listSchema(recipeInputSchema).exactOptional(),
  resources: listSchema(supportResourceSchema).exactOptional()
});

export const createGardenInputRequest = {
  query: emptyQuery,
  body: createGardenInputBody
} satisfies RequestSchemas;

const updateGardenInputBody = z.object({
  name: requiredShortTextSchema.exactOptional(),
  description: clearable(requiredLongTextSchema),
  category: categorySchema.exactOptional(),
  actions: clearable(listSchema(actionSchema)),
  activeIngredients: clearable(listSchema(requiredShortTextSchema)),
  nutrients: clearable(listSchema(requiredShortTextSchema)),
  targets: clearable(listSchema(requiredShortTextSchema)),
  recipes: clearable(listSchema(recipeInputSchema)),
  resources: clearable(listSchema(supportResourceSchema))
});

export const updateGardenInputRequest = {
  params: gardenInputIdOrSlugParams,
  query: emptyQuery,
  body: updateGardenInputBody
} satisfies RequestSchemas;

export const deleteGardenInputRequest = {
  params: gardenInputIdOrSlugParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

const gardenInputSelection = {
  fields: fieldsetSchema('gardenInputs', GARDEN_INPUT_FIELDS)
};

export const getGardenInputByIdOrSlugRequest = {
  params: gardenInputIdOrSlugParams,
  query: readQuerySchema(gardenInputSelection),
  body: emptyBody
} satisfies RequestSchemas;

const listGardenInputsQuery = listQuerySchema({
  filter: {
    slug: exactField(textItem),
    category: enumField(GARDEN_INPUT_CATEGORIES),
    action: enumField(GARDEN_INPUT_ACTIONS),
    status: enumField(['active', 'deleted'] as const)
  },
  sortableKeys: ['name', 'slug', 'category'],
  ...gardenInputSelection
}) satisfies z.ZodType<
  Omit<QueryOptions<GardenInputFilter, GardenInputField>, 'include'>
>;

export const listGardenInputsRequest = {
  query: listGardenInputsQuery,
  body: emptyBody
} satisfies RequestSchemas;
