import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import type { UpdateLocationBedsLayout } from '../../../../Contexts/Agro/Locations/application/useCases/UpdateLocationBedsLayout.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { updateLocationBedsLayoutRequest } from './requestSchemas.js';

export type LocationBedsLayoutPatchControllerDependencies = {
  updateLocationBedsLayout: UpdateLocationBedsLayout;
};

export class LocationBedsLayoutPatchController extends HttpController {
  private readonly updateLocationBedsLayout: UpdateLocationBedsLayout;

  constructor({
    updateLocationBedsLayout
  }: LocationBedsLayoutPatchControllerDependencies) {
    super();
    this.updateLocationBedsLayout = updateLocationBedsLayout;
  }

  protected status(): number {
    return httpStatus.NO_CONTENT;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params, body: layouts } = getValidatedRequest(
        res,
        updateLocationBedsLayoutRequest
      );
      const user = res.locals.user as UserSessionInfo;

      const updatedLocation = await this.updateLocationBedsLayout.execute(
        {
          locationId: params.id,
          userId: user.id,
          layouts: layouts.map((item) => ({
            id: item.id,
            position: item.position,
            ...(item.rotation !== undefined && { rotation: item.rotation })
          }))
        },
        user,
        getExpectedVersions(res)
      );

      setVersionETag(res, updatedLocation.version);
      res.status(this.status()).send();
    } catch (error) {
      next(error);
    }
  };
}
