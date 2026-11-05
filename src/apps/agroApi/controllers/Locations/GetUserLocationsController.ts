import { type NextFunction, type Request, type Response } from 'express';

import type { ListUserLocations } from '../../../../Contexts/Agro/Locations/application/useCases/ListUserLocations.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { toLocationResponse } from './locationResponse.js';
import { listLocationsRequest } from './requestSchemas.js';

export type GetUserLocationsControllerDependencies = {
  listUserLocations: ListUserLocations;
};

export class GetUserLocationsController extends HttpController {
  protected readonly listUserLocations: ListUserLocations;

  constructor({ listUserLocations }: GetUserLocationsControllerDependencies) {
    super();
    this.listUserLocations = listUserLocations;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = res.locals.user as UserSessionInfo;
      const { query } = getValidatedRequest(res, listLocationsRequest);

      const page = await this.listUserLocations.execute(user.id, {
        ...(query.sort && { sort: query.sort }),
        pagination: query.pagination
      });

      res.status(this.status()).json({
        data: page.data.map((location) => toLocationResponse(location)),
        pagination: page.pagination
      });
    } catch (error) {
      next(error);
    }
  };
}
