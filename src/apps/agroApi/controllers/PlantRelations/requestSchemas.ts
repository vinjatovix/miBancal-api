import { z } from 'zod';

import {
  PLANT_RELATION_RELATIONS,
  type PlantRelationField,
  type PlantRelationRelation
} from '../../../../Contexts/Agro/PlantRelations/application/queries/index.js';
import type { PlantRelationFilter } from '../../../../Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationFilter.js';
import { PlantRelationMechanisms } from '../../../../Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationMechanism.js';
import { PlantRelationTypes } from '../../../../Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationType.js';
import type { QueryOptions } from '../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import {
  enumField,
  exactField,
  identifierField,
  includeSchema,
  listQuerySchema,
  readQuerySchema,
  textItem
} from '../../shared/listQuerySchema.js';
import {
  emptyBody,
  emptyQuery,
  requiredLongTextSchema
} from '../../shared/requestSchemas.js';

export const proximityDistanceSchema = z
  .object({
    minDistanceCm: z.number().int().min(0),
    maxDistanceCm: z.number().int().min(0).nullable()
  })
  .refine(
    (data) =>
      data.maxDistanceCm === null || data.maxDistanceCm >= data.minDistanceCm,
    {
      message:
        'maxDistanceCm must be null or greater than or equal to minDistanceCm',
      path: ['maxDistanceCm']
    }
  );

export const plantRelationIdParams = z.object({
  id: z.uuid()
});

const genusRegex = /^[A-Z][a-zA-Z]{1,49}$/;

export const taxonomicSourceScopeSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('plant'), value: z.uuid() }),
  z.object({ scope: z.literal('genus'), value: z.string().regex(genusRegex) }),
  z.object({ scope: z.literal('family'), value: z.uuid() })
]);

export const taxonomicTargetScopeSchema = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('plant'), value: z.uuid() }),
  z.object({ scope: z.literal('genus'), value: z.string().regex(genusRegex) }),
  z.object({ scope: z.literal('family'), value: z.uuid() }),
  z.object({ scope: z.literal('all'), value: z.undefined().optional() })
]);

export const scopedCreatePlantRelationBody = z
  .object({
    id: z.uuid(),
    source: taxonomicSourceScopeSchema,
    target: taxonomicTargetScopeSchema,
    type: z.enum(PlantRelationTypes),
    mechanism: z.enum(PlantRelationMechanisms),
    strength: z.number().int().min(1).max(5),
    proximity: proximityDistanceSchema,
    reason: requiredLongTextSchema
  })
  .refine(
    (data) =>
      !(
        data.source.scope === data.target.scope &&
        data.source.value !== undefined &&
        data.target.value !== undefined &&
        data.source.value.toLowerCase() === data.target.value.toLowerCase()
      ),
    {
      message:
        '<PlantRelation> source and target participants must be distinct',
      path: ['target']
    }
  );

export const legacyCreatePlantRelationBody = z
  .object({
    id: z.uuid(),
    sourcePlantId: z.uuid(),
    targetPlantId: z.uuid(),
    type: z.enum(PlantRelationTypes),
    mechanism: z.enum(PlantRelationMechanisms),
    strength: z.number().int().min(1).max(5),
    proximity: proximityDistanceSchema,
    reason: requiredLongTextSchema
  })
  .refine((data) => data.sourcePlantId !== data.targetPlantId, {
    message: '<PlantRelation> sourcePlantId and targetPlantId must be distinct',
    path: ['targetPlantId']
  });

export const createPlantRelationBody = z.union([
  scopedCreatePlantRelationBody,
  legacyCreatePlantRelationBody
]);

export const createPlantRelationRequest = {
  query: emptyQuery,
  body: createPlantRelationBody
} satisfies RequestSchemas;

export const updatePlantRelationBody = z
  .object({
    type: z.enum(PlantRelationTypes).exactOptional(),
    mechanism: z.enum(PlantRelationMechanisms).exactOptional(),
    strength: z.number().int().min(1).max(5).exactOptional(),
    proximity: proximityDistanceSchema.exactOptional(),
    reason: requiredLongTextSchema.exactOptional()
  })
  .strict();

export const updatePlantRelationRequest = {
  params: plantRelationIdParams,
  query: emptyQuery,
  body: updatePlantRelationBody
} satisfies RequestSchemas;

export const deletePlantRelationRequest = {
  params: plantRelationIdParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

const plantRelationSelection = {
  include: includeSchema(PLANT_RELATION_RELATIONS)
};

export const getPlantRelationByIdRequest = {
  params: plantRelationIdParams,
  query: readQuerySchema(plantRelationSelection),
  body: emptyBody
} satisfies RequestSchemas;

const listPlantRelationsQuery = listQuerySchema({
  filter: {
    sourcePlantId: identifierField(),
    targetPlantId: identifierField(),
    plantId: identifierField(),
    sourceScope: enumField(['plant', 'genus', 'family'] as const),
    targetScope: enumField(['plant', 'genus', 'family', 'all'] as const),
    genus: exactField(textItem),
    familyId: identifierField(),
    appliesToPlantId: identifierField(),
    type: enumField(PlantRelationTypes),
    mechanism: enumField(PlantRelationMechanisms)
  },
  sortableKeys: ['createdAt', 'strength', 'type'] as const,
  ...plantRelationSelection
}) satisfies z.ZodType<
  QueryOptions<PlantRelationFilter, PlantRelationField, PlantRelationRelation>
>;

export const listPlantRelationsRequest = {
  query: listPlantRelationsQuery,
  body: emptyBody
} satisfies RequestSchemas;
