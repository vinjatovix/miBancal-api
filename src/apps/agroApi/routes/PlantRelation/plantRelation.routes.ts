import type { Router } from 'express';

import {
  createPlantRelationRequest,
  deletePlantRelationRequest,
  getPlantRelationByIdRequest,
  listPlantRelationsRequest,
  updatePlantRelationRequest
} from '../../controllers/PlantRelations/requestSchemas.js';
import {
  auth,
  isCatalogMaintainer,
  optionalAuth,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { plantRelationApiInvoker } from './plantRelationApiInvoker.js';

const prefix = API_PREFIXES.plantRelations;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.get(
    `${prefix}/`,
    optionalAuth,
    validateRequest(listPlantRelationsRequest),
    plantRelationApiInvoker('listPlantRelations')
  );

  router.post(
    `${prefix}/`,
    auth,
    isCatalogMaintainer,
    validateRequest(createPlantRelationRequest),
    plantRelationApiInvoker('createPlantRelation')
  );

  router.get(
    `${prefix}/:id`,
    optionalAuth,
    validateRequest(getPlantRelationByIdRequest),
    plantRelationApiInvoker('getPlantRelationById')
  );

  router.patch(
    `${prefix}/:id`,
    auth,
    isCatalogMaintainer,
    requireIfMatch,
    validateRequest(updatePlantRelationRequest),
    plantRelationApiInvoker('updatePlantRelation')
  );

  router.delete(
    `${prefix}/:id`,
    auth,
    isCatalogMaintainer,
    requireIfMatch,
    validateRequest(deletePlantRelationRequest),
    plantRelationApiInvoker('deletePlantRelation')
  );
};
