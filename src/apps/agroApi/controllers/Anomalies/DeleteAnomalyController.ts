import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { DeleteAnomaly } from '../../../../Contexts/Agro/Anomalies/application/useCases/DeleteAnomaly.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { getExpectedVersions } from '../../shared/versionTags.js';
import { deleteAnomalyRequest } from './requestSchemas.js';

export type DeleteAnomalyControllerDependencies = {
  deleteAnomaly: DeleteAnomaly;
};

export class DeleteAnomalyController extends HttpController {
  protected readonly deleteAnomaly: DeleteAnomaly;

  constructor({ deleteAnomaly }: DeleteAnomalyControllerDependencies) {
    super();
    this.deleteAnomaly = deleteAnomaly;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        params: { idOrSlug }
      } = getValidatedRequest(res, deleteAnomalyRequest);
      const user = res.locals.user as UserSessionInfo;

      await this.deleteAnomaly.execute(
        idOrSlug,
        user.username,
        getExpectedVersions(res)
      );

      res.status(httpStatus.NO_CONTENT).end();
    } catch (error) {
      next(error);
    }
  };
}
