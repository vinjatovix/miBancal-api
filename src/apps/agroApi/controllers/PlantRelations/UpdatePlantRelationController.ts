import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import type { UpdatePlantRelation } from '../../../../Contexts/Agro/PlantRelations/application/useCases/UpdatePlantRelation.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkResponse } from '../../shared/responseValidation.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { updatePlantRelationRequest } from './requestSchemas.js';
import {
  plantRelationResponseSchema,
  toPlantRelationResponse
} from './responseSchemas.js';

export type UpdatePlantRelationControllerDependencies = {
  updatePlantRelation: UpdatePlantRelation;
  logger: AppLogger;
};

export class UpdatePlantRelationController extends HttpController {
  private readonly updatePlantRelation: UpdatePlantRelation;
  private readonly logger: AppLogger;

  constructor({
    updatePlantRelation,
    logger
  }: UpdatePlantRelationControllerDependencies) {
    super();
    this.updatePlantRelation = updatePlantRelation;
    this.logger = logger;
  }

  protected override status(): number {
    return httpStatus.OK;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params, body } = getValidatedRequest(
        res,
        updatePlantRelationRequest
      );
      const user = res.locals.user as UserSessionInfo;

      const relation = await this.updatePlantRelation.execute(
        {
          ...body,
          id: params.id
        },
        user.username,
        getExpectedVersions(res)
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
