import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { CheckPlantLike } from '../../../../Contexts/Agro/PlantLikes/application/useCases/CheckPlantLike.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkPlantLikeRequest } from './requestSchemas.js';

export type CheckPlantLikeControllerDependencies = {
  checkPlantLike: CheckPlantLike;
};

export class CheckPlantLikeController extends HttpController {
  private readonly checkPlantLike: CheckPlantLike;

  constructor({ checkPlantLike }: CheckPlantLikeControllerDependencies) {
    super();
    this.checkPlantLike = checkPlantLike;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, checkPlantLikeRequest);
      const user = res.locals.user as UserSessionInfo;

      const response = await this.checkPlantLike.execute(params.plantId, user);

      res.status(httpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}
