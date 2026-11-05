import type { Router } from 'express';

import {
  createLocationRequest,
  deleteLocationRequest,
  getLocationByIdRequest,
  listLocationsRequest,
  updateLocationRequest
} from '../../controllers/Locations/requestSchemas.js';
import {
  auth,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { locationApiInvoker } from './locationApiInvoker.js';

const prefix = API_PREFIXES.locations;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.post(
    `${prefix}/`,
    auth,
    validateRequest(createLocationRequest),
    locationApiInvoker('createLocation')
  );

  router.get(
    `${prefix}`,
    auth,
    validateRequest(listLocationsRequest),
    locationApiInvoker('listUserLocations')
  );

  router.get(
    `${prefix}/:id`,
    auth,
    validateRequest(getLocationByIdRequest),
    locationApiInvoker('getLocationById')
  );

  router.patch(
    `${prefix}/:id`,
    auth,
    requireIfMatch,
    validateRequest(updateLocationRequest),
    locationApiInvoker('updateLocation')
  );

  router.delete(
    `${prefix}/:id`,
    auth,
    requireIfMatch,
    validateRequest(deleteLocationRequest),
    locationApiInvoker('deleteLocation')
  );
};
