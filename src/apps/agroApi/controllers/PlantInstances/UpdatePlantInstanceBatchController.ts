import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { UpdatePlantInstanceBatch } from '../../../../Contexts/Agro/PlantInstances/application/useCases/UpdatePlantInstanceBatch.js';
import { plantInstanceDomainMapper } from '../../../../Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { batchUpdatePlantInstancesRequest } from './requestSchemas.js';

export type UpdatePlantInstanceBatchControllerDependencies = {
  updatePlantInstanceBatch: UpdatePlantInstanceBatch;
};

export class UpdatePlantInstanceBatchController extends HttpController {
  protected readonly updatePlantInstanceBatch: UpdatePlantInstanceBatch;

  constructor({
    updatePlantInstanceBatch
  }: UpdatePlantInstanceBatchControllerDependencies) {
    super();
    this.updatePlantInstanceBatch = updatePlantInstanceBatch;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(
        res,
        batchUpdatePlantInstancesRequest
      );
      const user = res.locals.user as UserSessionInfo;

      const instances = await this.updatePlantInstanceBatch.execute(dto, user);
      const response = instances.map((instance) =>
        plantInstanceDomainMapper.toPrimitives(instance)
      );

      res.status(httpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}
