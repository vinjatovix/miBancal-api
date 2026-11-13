import { type NextFunction, type Request, type Response } from 'express';

import type { ListGardenInputs } from '../../../../Contexts/Agro/GardenInputs/application/useCases/ListGardenInputs.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkPage } from '../../shared/responseValidation.js';
import { listGardenInputsRequest } from './requestSchemas.js';
import { gardenInputFieldsetResponseSchema } from './responseSchemas.js';

export type ListGardenInputsControllerDependencies = {
  listGardenInputs: ListGardenInputs;
  logger: AppLogger;
};

export class ListGardenInputsController extends HttpController {
  protected readonly listGardenInputs: ListGardenInputs;
  private readonly logger: AppLogger;

  constructor({
    listGardenInputs,
    logger
  }: ListGardenInputsControllerDependencies) {
    super();
    this.listGardenInputs = listGardenInputs;
    this.logger = logger;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const user = res.locals.user as UserSessionInfo | undefined;
      const { query } = getValidatedRequest(res, listGardenInputsRequest);
      const page = await this.listGardenInputs.execute(user, { query });

      res.status(this.status()).json(
        checkPage(gardenInputFieldsetResponseSchema(query.fields), page, {
          resource: 'GardenInput',
          logger: this.logger
        })
      );
    } catch (error) {
      next(error);
    }
  };
}
