import type { Router } from 'express';

import {
  changeUserRolesRequest,
  getUserProfileRequest,
  lookupUserRequest,
  updateUserProfileRequest
} from '../../controllers/Users/requestSchemas.js';
import {
  auth,
  isAdmin,
  requireIfMatch,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { userApiInvoker } from './userApiInvoker.js';

const prefix = API_PREFIXES.users;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  // Registered before `/:userId/roles` so fixed path segments (`lookup`,
  // `profile`) are never captured as a `:userId`.
  router.get(
    `${prefix}/lookup`,
    auth,
    isAdmin,
    validateRequest(lookupUserRequest),
    userApiInvoker('lookupUser')
  );

  router.get(
    `${prefix}/profile`,
    auth,
    validateRequest(getUserProfileRequest),
    userApiInvoker('getUserProfile')
  );

  router.patch(
    `${prefix}/profile`,
    auth,
    requireIfMatch,
    validateRequest(updateUserProfileRequest),
    userApiInvoker('updateUserProfile')
  );

  router.patch(
    `${prefix}/:userId/roles`,
    auth,
    isAdmin,
    requireIfMatch,
    validateRequest(changeUserRolesRequest),
    userApiInvoker('changeUserRoles')
  );
};
