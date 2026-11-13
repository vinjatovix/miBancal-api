import type { Router } from 'express';

import {
  checkPlantLikeRequest,
  likePlantRequest,
  unlikePlantRequest
} from '../../controllers/PlantLikes/requestSchemas.js';
import {
  auth,
  userRateLimiter,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { plantLikeApiInvoker } from './plantLikeApiInvoker.js';

const prefix = API_PREFIXES.plants;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/:plantId/likes`,
    auth,
    userRateLimiter,
    validateRequest(likePlantRequest),
    plantLikeApiInvoker('likePlant')
  );

  router.delete(
    `${prefix}/:plantId/likes`,
    auth,
    userRateLimiter,
    validateRequest(unlikePlantRequest),
    plantLikeApiInvoker('unlikePlant')
  );

  router.get(
    `${prefix}/:plantId/likes/me`,
    auth,
    userRateLimiter,
    validateRequest(checkPlantLikeRequest),
    plantLikeApiInvoker('checkPlantLike')
  );
};
