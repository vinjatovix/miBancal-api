import type { NextFunction, Request, Response } from 'express';

import type { GetPlantRelationById } from '../../../../Contexts/Agro/PlantRelations/application/useCases/GetPlantRelationById.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkResponse } from '../../shared/responseValidation.js';
import {
  isFullRepresentation,
  setVersionETag
} from '../../shared/versionTags.js';
import { getPlantRelationByIdRequest } from './requestSchemas.js';
import { plantRelationResponseSchema } from './responseSchemas.js';

export type GetPlantRelationByIdControllerDependencies = {
  getPlantRelationById: GetPlantRelationById;
  logger: AppLogger;
};

export class GetPlantRelationByIdController extends HttpController {
  private readonly getPlantRelationById: GetPlantRelationById;
  private readonly logger: AppLogger;

  constructor({
    getPlantRelationById,
    logger
  }: GetPlantRelationByIdControllerDependencies) {
    super();
    this.getPlantRelationById = getPlantRelationById;
    this.logger = logger;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        params: { id },
        query
      } = getValidatedRequest(res, getPlantRelationByIdRequest);

      const relation = await this.getPlantRelationById.execute(id, query);
      const context = {
        resource: 'PlantRelation' as const,
        id: relation.id,
        logger: this.logger
      };

      const body = checkResponse(
        plantRelationResponseSchema,
        relation,
        context
      );

      if (isFullRepresentation(query)) {
        setVersionETag(res, body.version);
      }

      res.status(this.status()).json(body);
    } catch (error) {
      next(error);
    }
  };
}
