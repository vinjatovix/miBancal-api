import type { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';

import type { DeletePlantRelation } from '../../../../Contexts/Agro/PlantRelations/application/useCases/DeletePlantRelation.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { getExpectedVersions } from '../../shared/versionTags.js';
import { deletePlantRelationRequest } from './requestSchemas.js';

export type DeletePlantRelationControllerDependencies = {
  deletePlantRelation: DeletePlantRelation;
};

export class DeletePlantRelationController extends HttpController {
  private readonly deletePlantRelation: DeletePlantRelation;

  constructor({
    deletePlantRelation
  }: DeletePlantRelationControllerDependencies) {
    super();
    this.deletePlantRelation = deletePlantRelation;
  }

  protected override status(): number {
    return httpStatus.NO_CONTENT;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, deletePlantRelationRequest);

      await this.deletePlantRelation.execute(
        params.id,
        getExpectedVersions(res)
      );

      res.status(this.status()).end();
    } catch (error) {
      next(error);
    }
  };
}
