import { type NextFunction, type Request, type Response } from 'express';

import type { UpdateLocation } from '../../../../Contexts/Agro/Locations/application/useCases/UpdateLocation.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { toLocationResponse } from './locationResponse.js';
import { updateLocationRequest } from './requestSchemas.js';

export type UpdateLocationControllerDependencies = {
  updateLocation: UpdateLocation;
};

export class UpdateLocationController extends HttpController {
  protected readonly updateLocation: UpdateLocation;

  constructor({ updateLocation }: UpdateLocationControllerDependencies) {
    super();
    this.updateLocation = updateLocation;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params, body: dto } = getValidatedRequest(
        res,
        updateLocationRequest
      );
      const user = res.locals.user as UserSessionInfo;

      const location = await this.updateLocation.execute(
        { ...dto, id: params.id, userId: user.id },
        user.username,
        getExpectedVersions(res)
      );

      const response = toLocationResponse(location);

      setVersionETag(res, location.version);
      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
