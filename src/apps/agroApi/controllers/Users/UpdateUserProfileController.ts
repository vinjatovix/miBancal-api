import { type NextFunction, type Request, type Response } from 'express';

import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { UpdateUserProfile } from '../../../../Contexts/Auth/application/useCases/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { updateUserProfileRequest } from './requestSchemas.js';
import { toUserProfileView } from './userResponse.js';

export type UpdateUserProfileControllerDependencies = {
  updateUserProfile: UpdateUserProfile;
};

export class UpdateUserProfileController extends HttpController {
  private readonly updateUserProfile: UpdateUserProfile;

  constructor({ updateUserProfile }: UpdateUserProfileControllerDependencies) {
    super();
    this.updateUserProfile = updateUserProfile;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      getValidatedRequest(res, updateUserProfileRequest);
      const user = res.locals.user as UserSessionInfo;

      const result = await this.updateUserProfile.execute(
        { userId: user.id },
        getExpectedVersions(res)
      );

      setVersionETag(res, result.version ?? 0);
      res.status(this.status()).json(toUserProfileView(result));
    } catch (error) {
      next(error);
    }
  };
}
