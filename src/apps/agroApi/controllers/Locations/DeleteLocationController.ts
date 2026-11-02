import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { DeleteLocation } from '../../../../Contexts/Agro/Locations/application/useCases/DeleteLocation.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { getExpectedVersions } from '../../shared/versionTags.js';
import { deleteLocationRequest } from './requestSchemas.js';

export type DeleteLocationControllerDependencies = {
  deleteLocation: DeleteLocation;
};

export class DeleteLocationController extends HttpController {
  protected readonly deleteLocation: DeleteLocation;

  constructor({ deleteLocation }: DeleteLocationControllerDependencies) {
    super();
    this.deleteLocation = deleteLocation;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, deleteLocationRequest);
      const user = res.locals.user as UserSessionInfo;

      await this.deleteLocation.execute(
        params.id,
        user.id,
        user.username,
        getExpectedVersions(res)
      );

      res.status(httpStatus.NO_CONTENT).end();
    } catch (error) {
      next(error);
    }
  };
}
