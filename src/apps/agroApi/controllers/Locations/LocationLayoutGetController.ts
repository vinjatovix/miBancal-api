import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import type { GetLocationLayout } from '../../../../Contexts/Agro/Locations/application/useCases/GetLocationLayout.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { getLocationLayoutRequest } from './requestSchemas.js';

export type LocationLayoutGetControllerDependencies = {
  getLocationLayout: GetLocationLayout;
};

export class LocationLayoutGetController extends HttpController {
  private readonly getLocationLayout: GetLocationLayout;

  constructor({ getLocationLayout }: LocationLayoutGetControllerDependencies) {
    super();
    this.getLocationLayout = getLocationLayout;
  }

  protected status(): number {
    return httpStatus.OK;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, getLocationLayoutRequest);
      const user = res.locals.user as UserSessionInfo;

      const layout = await this.getLocationLayout.execute(params.id, user.id);

      setVersionETag(res, layout.location.version);
      res.status(this.status()).json(layout);
    } catch (error) {
      next(error);
    }
  };
}
