import type { Router } from 'express';
import {
  addPlantBookmarkRequest,
  checkPlantBookmarkRequest,
  getUserBookmarksRequest,
  removePlantBookmarkRequest
} from '../../controllers/Bookmarks/requestSchemas.js';
import { auth, validateRequest } from '../../middlewares/index.js';
import type { RegisterRoutes } from '../route.types.js';
import { API_PREFIXES } from '../shared/apiPrefixes.js';
import { bookmarkApiInvoker } from './bookmarkApiInvoker.js';

const prefix = API_PREFIXES.bookmarks;

export const registerRoutes: RegisterRoutes = (router: Router): void => {
  router.get(
    `${prefix}`,
    auth,
    validateRequest(getUserBookmarksRequest),
    bookmarkApiInvoker('getUserBookmarks')
  );

  router.post(
    `${prefix}/plants`,
    auth,
    validateRequest(addPlantBookmarkRequest),
    bookmarkApiInvoker('addPlantBookmark')
  );

  router.delete(
    `${prefix}/plants/:plantId`,
    auth,
    validateRequest(removePlantBookmarkRequest),
    bookmarkApiInvoker('removePlantBookmark')
  );

  router.get(
    `${prefix}/plants/:plantId`,
    auth,
    validateRequest(checkPlantBookmarkRequest),
    bookmarkApiInvoker('checkPlantBookmark')
  );
};
