import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import type { CreatePlantRelation } from '../../../../Contexts/Agro/PlantRelations/application/useCases/CreatePlantRelation.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkResponse } from '../../shared/responseValidation.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { createPlantRelationRequest } from './requestSchemas.js';
import {
  plantRelationResponseSchema,
  toPlantRelationResponse
} from './responseSchemas.js';

export type CreatePlantRelationControllerDependencies = {
  createPlantRelation: CreatePlantRelation;
  logger: AppLogger;
};

export class CreatePlantRelationController extends HttpController {
  private readonly createPlantRelation: CreatePlantRelation;
  private readonly logger: AppLogger;

  constructor({
    createPlantRelation,
    logger
  }: CreatePlantRelationControllerDependencies) {
    super();
    this.createPlantRelation = createPlantRelation;
    this.logger = logger;
  }

  protected override status(): number {
    return httpStatus.CREATED;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body } = getValidatedRequest(res, createPlantRelationRequest);
      const user = res.locals.user as UserSessionInfo;

      const relation = await this.createPlantRelation.execute(
        body,
        user.username
      );

      const relationResponse = toPlantRelationResponse(relation);
      const context = {
        resource: 'PlantRelation' as const,
        id: relation.id,
        logger: this.logger
      };

      const checkedBody = checkResponse(
        plantRelationResponseSchema,
        relationResponse,
        context
      );

      setVersionETag(res, relation.version);
      res.status(this.status()).json(checkedBody);
    } catch (error) {
      next(error);
    }
  };
}
