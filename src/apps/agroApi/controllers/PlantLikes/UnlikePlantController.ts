import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { UnlikePlant } from '../../../../Contexts/Agro/PlantLikes/application/useCases/UnlikePlant.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { unlikePlantRequest } from './requestSchemas.js';

export type UnlikePlantControllerDependencies = {
  unlikePlant: UnlikePlant;
};

export class UnlikePlantController extends HttpController {
  private readonly unlikePlant: UnlikePlant;

  constructor({ unlikePlant }: UnlikePlantControllerDependencies) {
    super();
    this.unlikePlant = unlikePlant;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, unlikePlantRequest);
      const user = res.locals.user as UserSessionInfo;

      await this.unlikePlant.execute(params.plantId, user);

      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}
