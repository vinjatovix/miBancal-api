import type { Router } from 'express';

import {
  createPlantRequest,
  deletePlantRequest,
  getPlantByIdRequest,
  listPlantsRequest,
  updatePlantRequest
} from '../../controllers/Plants/requestSchemas.js';
import {
  auth,
  isCatalogMaintainer,
  optionalAuth,
  requireIfMatch,
  userRateLimiter,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { plantApiInvoker } from './plantApiInvoker.js';

const prefix = API_PREFIXES.plants;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    isCatalogMaintainer,
    validateRequest(createPlantRequest),
    plantApiInvoker('createPlant')
  );

  router.get(
    `${prefix}/`,
    optionalAuth,
    userRateLimiter,
    validateRequest(listPlantsRequest),
    plantApiInvoker('getAllPlants')
  );

  router.get(
    `${prefix}/:id`,
    optionalAuth,
    userRateLimiter,
    validateRequest(getPlantByIdRequest),
    plantApiInvoker('getPlantById')
  );
  router.patch(
    `${prefix}/:id`,
    auth,
    isCatalogMaintainer,
    requireIfMatch,
    validateRequest(updatePlantRequest),
    plantApiInvoker('updatePlant')
  );
  router.delete(
    `${prefix}/:id`,
    auth,
    isCatalogMaintainer,
    requireIfMatch,
    validateRequest(deletePlantRequest),
    plantApiInvoker('deletePlant')
  );
};
