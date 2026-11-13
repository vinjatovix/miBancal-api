import { type NextFunction, type Request, type Response } from 'express';

import type { GetLocationById } from '../../../../Contexts/Agro/Locations/application/useCases/GetLocationById.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { toLocationResponse } from './locationResponse.js';
import { getLocationByIdRequest } from './requestSchemas.js';

export type GetLocationByIdControllerDependencies = {
  getLocationById: GetLocationById;
};

export class GetLocationByIdController extends HttpController {
  protected readonly getLocationById: GetLocationById;

  constructor({ getLocationById }: GetLocationByIdControllerDependencies) {
    super();
    this.getLocationById = getLocationById;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params, query } = getValidatedRequest(
        res,
        getLocationByIdRequest
      );
      const user = res.locals.user as UserSessionInfo;

      const { location, beds } = await this.getLocationById.execute(
        params.id,
        user.id,
        query?.include
      );

      const response = toLocationResponse(location, beds);

      if (beds === undefined) {
        setVersionETag(res, location.version);
      }
      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
