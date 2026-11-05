import { makeInvoker } from 'awilix-express';
import type { AddPlantBookmarkController } from '../../controllers/Bookmarks/AddPlantBookmarkController.js';
import type { CheckPlantBookmarkController } from '../../controllers/Bookmarks/CheckPlantBookmarkController.js';
import type { GetUserBookmarksController } from '../../controllers/Bookmarks/GetUserBookmarksController.js';
import type { RemovePlantBookmarkController } from '../../controllers/Bookmarks/RemovePlantBookmarkController.js';

const api = ({
  addPlantBookmarkController,
  removePlantBookmarkController,
  getUserBookmarksController,
  checkPlantBookmarkController
}: {
  addPlantBookmarkController: AddPlantBookmarkController;
  removePlantBookmarkController: RemovePlantBookmarkController;
  getUserBookmarksController: GetUserBookmarksController;
  checkPlantBookmarkController: CheckPlantBookmarkController;
}) => ({
  addPlantBookmark: addPlantBookmarkController.run,
  removePlantBookmark: removePlantBookmarkController.run,
  getUserBookmarks: getUserBookmarksController.run,
  checkPlantBookmark: checkPlantBookmarkController.run
});

export const bookmarkApiInvoker = makeInvoker(api);
