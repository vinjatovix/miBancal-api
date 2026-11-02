import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { CreateLocation } from '../../../../Contexts/Agro/Locations/application/useCases/CreateLocation.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { toLocationResponse } from './locationResponse.js';
import { createLocationRequest } from './requestSchemas.js';

export type CreateLocationControllerDependencies = {
  createLocation: CreateLocation;
};

export class CreateLocationController extends HttpController {
  protected readonly createLocation: CreateLocation;

  constructor({ createLocation }: CreateLocationControllerDependencies) {
    super();
    this.createLocation = createLocation;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(res, createLocationRequest);
      const user = res.locals.user as UserSessionInfo;

      const location = await this.createLocation.execute(
        { ...dto, userId: user.id },
        user.username
      );

      const response = toLocationResponse(location);

      setVersionETag(res, location.version);
      res.status(httpStatus.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };
}
