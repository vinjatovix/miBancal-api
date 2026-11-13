import { type NextFunction, type Request, type Response } from 'express';
import type { LikePlant } from '../../../../Contexts/Agro/PlantLikes/application/useCases/LikePlant.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { likePlantRequest } from './requestSchemas.js';

export type LikePlantControllerDependencies = {
  likePlant: LikePlant;
};

export class LikePlantController extends HttpController {
  private readonly likePlant: LikePlant;

  constructor({ likePlant }: LikePlantControllerDependencies) {
    super();
    this.likePlant = likePlant;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, likePlantRequest);
      const user = res.locals.user as UserSessionInfo;

      const result = await this.likePlant.execute(
        { plantId: params.plantId },
        user
      );

      res.status(result.status).json(result.item);
    } catch (error) {
      next(error);
    }
  };
}
