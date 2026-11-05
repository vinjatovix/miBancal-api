import { type NextFunction, type Request, type Response } from 'express';

import type { ListAnomalies } from '../../../../Contexts/Agro/Anomalies/application/useCases/ListAnomalies.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkPage } from '../../shared/responseValidation.js';
import { listAnomaliesRequest } from './requestSchemas.js';
import { anomalyFieldsetResponseSchema } from './responseSchemas.js';

export type GetAllAnomaliesControllerDependencies = {
  listAnomalies: ListAnomalies;
  logger: AppLogger;
};

export class GetAllAnomaliesController extends HttpController {
  protected readonly listAnomalies: ListAnomalies;
  private readonly logger: AppLogger;

  constructor({
    listAnomalies,
    logger
  }: GetAllAnomaliesControllerDependencies) {
    super();
    this.listAnomalies = listAnomalies;
    this.logger = logger;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = res.locals.user as UserSessionInfo | undefined;
      const { query } = getValidatedRequest(res, listAnomaliesRequest);
      const page = await this.listAnomalies.execute(user, { query });

      res.status(this.status()).json(
        checkPage(anomalyFieldsetResponseSchema(query.fields), page, {
          resource: 'Anomaly',
          logger: this.logger
        })
      );
    } catch (error) {
      next(error);
    }
  };
}
