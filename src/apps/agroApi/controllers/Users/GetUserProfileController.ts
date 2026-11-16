import { type NextFunction, type Request, type Response } from 'express';

import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { GetUserProfile } from '../../../../Contexts/Auth/application/useCases/index.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { toUserProfileView } from './userResponse.js';

export type GetUserProfileControllerDependencies = {
  getUserProfile: GetUserProfile;
};

export class GetUserProfileController extends HttpController {
  private readonly getUserProfile: GetUserProfile;

  constructor({ getUserProfile }: GetUserProfileControllerDependencies) {
    super();
    this.getUserProfile = getUserProfile;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = res.locals.user as UserSessionInfo;
      const result = await this.getUserProfile.execute(user.id);

      setVersionETag(res, result.version ?? 0);
      res.status(this.status()).json(toUserProfileView(result));
    } catch (error) {
      next(error);
    }
  };
}
