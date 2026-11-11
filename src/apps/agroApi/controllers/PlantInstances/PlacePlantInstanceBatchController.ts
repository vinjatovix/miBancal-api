import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { PlacePlantInstanceBatch } from '../../../../Contexts/Agro/PlantInstances/application/useCases/PlacePlantInstanceBatch.js';
import { plantInstanceDomainMapper } from '../../../../Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { batchPlacePlantInstancesRequest } from './requestSchemas.js';

export type PlacePlantInstanceBatchControllerDependencies = {
  placePlantInstanceBatch: PlacePlantInstanceBatch;
};

export class PlacePlantInstanceBatchController extends HttpController {
  protected readonly placePlantInstanceBatch: PlacePlantInstanceBatch;

  constructor({
    placePlantInstanceBatch
  }: PlacePlantInstanceBatchControllerDependencies) {
    super();
    this.placePlantInstanceBatch = placePlantInstanceBatch;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(
        res,
        batchPlacePlantInstancesRequest
      );
      const user = res.locals.user as UserSessionInfo;

      const instances = await this.placePlantInstanceBatch.execute(dto, user);
      const response = instances.map((instance) =>
        plantInstanceDomainMapper.toPrimitives(instance)
      );

      res.status(httpStatus.CREATED).json(response);
    } catch (error) {
      next(error);
    }
  };
}
