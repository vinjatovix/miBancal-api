import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { RemovePlantInstanceBatch } from '../../../../Contexts/Agro/PlantInstances/application/useCases/RemovePlantInstanceBatch.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { batchRemovePlantInstancesRequest } from './requestSchemas.js';

export type RemovePlantInstanceBatchControllerDependencies = {
  removePlantInstanceBatch: RemovePlantInstanceBatch;
};

export class RemovePlantInstanceBatchController extends HttpController {
  protected readonly removePlantInstanceBatch: RemovePlantInstanceBatch;

  constructor({
    removePlantInstanceBatch
  }: RemovePlantInstanceBatchControllerDependencies) {
    super();
    this.removePlantInstanceBatch = removePlantInstanceBatch;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(
        res,
        batchRemovePlantInstancesRequest
      );
      const user = res.locals.user as UserSessionInfo;

      await this.removePlantInstanceBatch.execute(dto, user);

      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}
