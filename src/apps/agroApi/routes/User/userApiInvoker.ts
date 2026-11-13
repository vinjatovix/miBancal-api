import { makeInvoker } from 'awilix-express';

import type { ChangeUserRolesController } from '../../controllers/Users/ChangeUserRolesController.js';
import type { GetUserProfileController } from '../../controllers/Users/GetUserProfileController.js';
import type { LookupUserController } from '../../controllers/Users/LookupUserController.js';
import type { UpdateUserProfileController } from '../../controllers/Users/UpdateUserProfileController.js';

const api = ({
  changeUserRolesController,
  getUserProfileController,
  lookupUserController,
  updateUserProfileController
}: {
  changeUserRolesController: ChangeUserRolesController;
  getUserProfileController: GetUserProfileController;
  lookupUserController: LookupUserController;
  updateUserProfileController: UpdateUserProfileController;
}) => ({
  changeUserRoles: changeUserRolesController.run,
  getUserProfile: getUserProfileController.run,
  lookupUser: lookupUserController.run,
  updateUserProfile: updateUserProfileController.run
});

export const userApiInvoker = makeInvoker(api);
