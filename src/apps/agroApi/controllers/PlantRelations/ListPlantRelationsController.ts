import type { NextFunction, Request, Response } from 'express';

import type { ListPlantRelations } from '../../../../Contexts/Agro/PlantRelations/application/useCases/ListPlantRelations.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkPage } from '../../shared/responseValidation.js';
import { listPlantRelationsRequest } from './requestSchemas.js';
import { plantRelationResponseSchema } from './responseSchemas.js';

export type ListPlantRelationsControllerDependencies = {
  listPlantRelations: ListPlantRelations;
  logger: AppLogger;
};

export class ListPlantRelationsController extends HttpController {
  private readonly listPlantRelations: ListPlantRelations;
  private readonly logger: AppLogger;

  constructor({
    listPlantRelations,
    logger
  }: ListPlantRelationsControllerDependencies) {
    super();
    this.listPlantRelations = listPlantRelations;
    this.logger = logger;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query } = getValidatedRequest(res, listPlantRelationsRequest);
      const page = await this.listPlantRelations.execute({ query });

      res.status(this.status()).json(
        checkPage(plantRelationResponseSchema, page, {
          resource: 'PlantRelation',
          logger: this.logger
        })
      );
    } catch (error) {
      next(error);
    }
  };
}
