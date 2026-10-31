import type { Router } from 'express';
import {
  addPlantBookmarkRequest,
  checkPlantBookmarkRequest,
  getUserBookmarksRequest,
  removePlantBookmarkRequest
} from '../../controllers/Bookmarks/requestSchemas.js';
import {
  auth,
  userRateLimiter,
  validateRequest
} from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { bookmarkApiInvoker } from './bookmarkApiInvoker.js';

const prefix = API_PREFIXES.bookmarks;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.get(
    `${prefix}`,
    auth,
    userRateLimiter,
    validateRequest(getUserBookmarksRequest),
    bookmarkApiInvoker('getUserBookmarks')
  );

  router.post(
    `${prefix}/plants`,
    auth,
    userRateLimiter,
    validateRequest(addPlantBookmarkRequest),
    bookmarkApiInvoker('addPlantBookmark')
  );

  router.delete(
    `${prefix}/plants/:plantId`,
    auth,
    userRateLimiter,
    validateRequest(removePlantBookmarkRequest),
    bookmarkApiInvoker('removePlantBookmark')
  );

  router.get(
    `${prefix}/plants/:plantId`,
    auth,
    userRateLimiter,
    validateRequest(checkPlantBookmarkRequest),
    bookmarkApiInvoker('checkPlantBookmark')
  );
};
