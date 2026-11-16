import { z } from 'zod';

import { CropGrowthStatus } from '../../../../Contexts/Agro/PlantInstances/domain/entities/types/index.js';
import type { RequestSchemas } from '../../middlewares/validateRequest.js';
import { emptyBody, emptyQuery } from '../../shared/requestSchemas.js';

export const plantInstanceIdParams = z.object({
  id: z.uuid()
});

const coordinatesSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0)
});

const cropGrowthStatusSchema = z.enum(CropGrowthStatus);

export const placePlantInstanceBody = z.object({
  id: z.uuid(),
  bedId: z.uuid(),
  plantId: z.uuid(),
  position: coordinatesSchema.exactOptional(),
  growthStatus: cropGrowthStatusSchema.exactOptional(),
  plantedAt: z.iso.datetime().exactOptional(),
  variety: z.string().min(1).max(100).exactOptional(),
  notes: z.string().max(1000).exactOptional()
});

export const placePlantInstanceRequest = {
  query: emptyQuery,
  body: placePlantInstanceBody
} satisfies RequestSchemas;

export const updatePlantInstanceBody = z.object({
  position: coordinatesSchema.exactOptional(),
  growthStatus: cropGrowthStatusSchema.exactOptional(),
  variety: z.string().min(1).max(100).nullable().exactOptional(),
  notes: z.string().max(1000).nullable().exactOptional()
});

export const updatePlantInstanceRequest = {
  params: plantInstanceIdParams,
  query: emptyQuery,
  body: updatePlantInstanceBody
} satisfies RequestSchemas;

export const getPlantInstanceByIdRequest = {
  params: plantInstanceIdParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const deletePlantInstanceRequest = {
  params: plantInstanceIdParams,
  query: emptyQuery,
  body: emptyBody
} satisfies RequestSchemas;

export const listPlantInstancesQuery = z.object({
  filter: z
    .object({
      bedId: z
        .object({
          eq: z.uuid()
        })
        .exactOptional(),
      plantId: z
        .object({
          eq: z.uuid()
        })
        .exactOptional()
    })
    .exactOptional(),
  sort: z
    .object({
      plantedAt: z.enum(['asc', 'desc'])
    })
    .exactOptional(),
  pagination: z
    .object({
      page: z.coerce.number().int().min(1).exactOptional(),
      limit: z.coerce.number().int().min(1).max(100).exactOptional()
    })
    .exactOptional()
});

export const listPlantInstancesRequest = {
  query: listPlantInstancesQuery,
  body: emptyBody
} satisfies RequestSchemas;

const hasUniqueIds = (items: Array<{ id: string }>): boolean =>
  new Set(items.map((item) => item.id)).size === items.length;

export const batchPlacePlantInstanceItemSchema = z.object({
  id: z.uuid(),
  plantId: z.uuid(),
  position: coordinatesSchema.exactOptional(),
  growthStatus: cropGrowthStatusSchema
    .exactOptional()
    .default(CropGrowthStatus.PLANTED),
  variety: z.string().min(1).max(100).nullable().exactOptional(),
  notes: z.string().max(1000).nullable().exactOptional()
});

export const batchPlacePlantInstancesBody = z.object({
  bedId: z.uuid(),
  items: z
    .array(batchPlacePlantInstanceItemSchema)
    .min(1)
    .max(100)
    .refine(hasUniqueIds, {
      message: 'Duplicate item IDs within batch'
    })
});

export const batchPlacePlantInstancesRequest = {
  query: emptyQuery,
  body: batchPlacePlantInstancesBody
} satisfies RequestSchemas;

export const batchUpdatePlantInstanceItemSchema = z.object({
  id: z.uuid(),
  version: z.number().int().min(0),
  position: coordinatesSchema.exactOptional(),
  growthStatus: cropGrowthStatusSchema.exactOptional(),
  variety: z.string().min(1).max(100).nullable().exactOptional(),
  notes: z.string().max(1000).nullable().exactOptional()
});

export const batchUpdatePlantInstancesBody = z.object({
  items: z
    .array(batchUpdatePlantInstanceItemSchema)
    .min(1)
    .max(100)
    .refine(hasUniqueIds, {
      message: 'Duplicate item IDs within batch'
    })
});

export const batchUpdatePlantInstancesRequest = {
  query: emptyQuery,
  body: batchUpdatePlantInstancesBody
} satisfies RequestSchemas;

export const batchRemovePlantInstanceItemSchema = z.object({
  id: z.uuid(),
  version: z.number().int().min(0)
});

export const batchRemovePlantInstancesBody = z.object({
  items: z
    .array(batchRemovePlantInstanceItemSchema)
    .min(1)
    .max(100)
    .refine(hasUniqueIds, {
      message: 'Duplicate item IDs within batch'
    })
});

export const batchRemovePlantInstancesRequest = {
  query: emptyQuery,
  body: batchRemovePlantInstancesBody
} satisfies RequestSchemas;
