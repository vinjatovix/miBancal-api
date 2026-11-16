import type { Router } from 'express';

import {
  createAnomalyRequest,
  deleteAnomalyRequest,
  getAnomalyByIdOrSlugRequest,
  listAnomaliesRequest,
  updateAnomalyRequest
} from '../../controllers/Anomalies/requestSchemas.js';
import {
  auth,
  isCatalogMaintainer,
  optionalAuth,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { anomalyApiInvoker } from './anomalyApiInvoker.js';

const prefix = API_PREFIXES.anomalies;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    isCatalogMaintainer,
    validateRequest(createAnomalyRequest),
    anomalyApiInvoker('createAnomaly')
  );

  router.get(
    `${prefix}/`,
    optionalAuth,
    validateRequest(listAnomaliesRequest),
    anomalyApiInvoker('getAllAnomalies')
  );

  router.get(
    `${prefix}/:idOrSlug`,
    optionalAuth,
    validateRequest(getAnomalyByIdOrSlugRequest),
    anomalyApiInvoker('getAnomalyBySlug')
  );

  router.patch(
    `${prefix}/:idOrSlug`,
    auth,
    isCatalogMaintainer,
    requireIfMatch,
    validateRequest(updateAnomalyRequest),
    anomalyApiInvoker('updateAnomaly')
  );

  router.delete(
    `${prefix}/:idOrSlug`,
    auth,
    isCatalogMaintainer,
    requireIfMatch,
    validateRequest(deleteAnomalyRequest),
    anomalyApiInvoker('deleteAnomaly')
  );
};
