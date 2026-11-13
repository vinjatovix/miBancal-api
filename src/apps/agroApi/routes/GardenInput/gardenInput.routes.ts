import type { Router } from 'express';

import {
  createGardenInputRequest,
  deleteGardenInputRequest,
  getGardenInputByIdOrSlugRequest,
  listGardenInputsRequest,
  updateGardenInputRequest
} from '../../controllers/GardenInputs/requestSchemas.js';
import {
  auth,
  isCatalogMaintainer,
  optionalAuth,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { gardenInputApiInvoker } from './gardenInputApiInvoker.js';

const prefix = API_PREFIXES.gardenInputs;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.get(
    `${prefix}/`,
    optionalAuth,
    validateRequest(listGardenInputsRequest),
    gardenInputApiInvoker('listGardenInputs')
  );

  router.post(
    `${prefix}/`,
    auth,
    isCatalogMaintainer,
    validateRequest(createGardenInputRequest),
    gardenInputApiInvoker('createGardenInput')
  );

  router.get(
    `${prefix}/:idOrSlug`,
    optionalAuth,
    validateRequest(getGardenInputByIdOrSlugRequest),
    gardenInputApiInvoker('getGardenInputByIdOrSlug')
  );

  router.patch(
    `${prefix}/:idOrSlug`,
    auth,
    isCatalogMaintainer,
    requireIfMatch,
    validateRequest(updateGardenInputRequest),
    gardenInputApiInvoker('updateGardenInput')
  );

  router.delete(
    `${prefix}/:idOrSlug`,
    auth,
    isCatalogMaintainer,
    requireIfMatch,
    validateRequest(deleteGardenInputRequest),
    gardenInputApiInvoker('deleteGardenInput')
  );
};
