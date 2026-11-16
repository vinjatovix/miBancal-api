import { z } from 'zod';

import type { PlantRelation } from '../../../../Contexts/Agro/PlantRelations/domain/entities/PlantRelation.js';
import { PlantRelationMechanisms } from '../../../../Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationMechanism.js';
import { PlantRelationTypes } from '../../../../Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationType.js';
import {
  metadataResponseSchema,
  requiredLongTextResponseSchema
} from '../../shared/responseSchemas.js';
import { familySummarySchema } from '../Plants/responseSchemas.js';

export const proximityDistanceResponseSchema = z.object({
  minDistanceCm: z.number().int().min(0),
  maxDistanceCm: z.number().int().min(0).nullable()
});

export const plantSummaryResponseSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.object({
    primary: z.string(),
    aliases: z.array(z.string()).optional()
  }),
  scientificName: z.string(),
  image: z
    .object({
      url: z.string(),
      title: z.string().optional(),
      source: z.string().optional()
    })
    .nullable()
});

export type PlantSummaryResponse = z.output<typeof plantSummaryResponseSchema>;

export const taxonomicSourceScopeResponseSchema = z.object({
  scope: z.enum(['plant', 'genus', 'family']),
  value: z.string().optional()
});

export const taxonomicTargetScopeResponseSchema = z.object({
  scope: z.enum(['plant', 'genus', 'family', 'all']),
  value: z.string().optional()
});

export const plantRelationResponseSchema = z.object({
  id: z.uuid(),
  source: taxonomicSourceScopeResponseSchema,
  target: taxonomicTargetScopeResponseSchema,
  sourcePlantId: z.uuid().optional(),
  targetPlantId: z.uuid().optional(),
  type: z.enum(PlantRelationTypes),
  mechanism: z.enum(PlantRelationMechanisms),
  strength: z.number().int().min(1).max(5),
  proximity: proximityDistanceResponseSchema,
  reason: requiredLongTextResponseSchema,
  metadata: metadataResponseSchema,
  version: z.number().int().min(0),
  sourcePlant: plantSummaryResponseSchema.optional(),
  targetPlant: plantSummaryResponseSchema.optional(),
  sourceFamily: familySummarySchema.optional(),
  targetFamily: familySummarySchema.optional(),
  appliesVia: z.enum(['plant', 'genus', 'family', 'all']).optional(),
  role: z.enum(['source', 'target']).optional()
});

export type PlantRelationResponse = z.output<
  typeof plantRelationResponseSchema
>;

export const paginatedPlantRelationsResponseSchema = z.object({
  data: z.array(plantRelationResponseSchema),
  pagination: z.object({
    totalItems: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().min(0)
  })
});

export type PaginatedPlantRelationsResponse = z.output<
  typeof paginatedPlantRelationsResponseSchema
>;

export const toPlantRelationResponse = (
  relation: PlantRelation
): PlantRelationResponse => relation.toPrimitives();
