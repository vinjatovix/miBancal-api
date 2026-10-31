import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { DeleteGardenInput } from '../../../../Contexts/Agro/GardenInputs/application/useCases/DeleteGardenInput.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { getExpectedVersions } from '../../shared/versionTags.js';
import { deleteGardenInputRequest } from './requestSchemas.js';

export type DeleteGardenInputControllerDependencies = {
  deleteGardenInput: DeleteGardenInput;
};

export class DeleteGardenInputController extends HttpController {
  protected readonly deleteGardenInput: DeleteGardenInput;

  constructor({ deleteGardenInput }: DeleteGardenInputControllerDependencies) {
    super();
    this.deleteGardenInput = deleteGardenInput;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        params: { idOrSlug }
      } = getValidatedRequest(res, deleteGardenInputRequest);
      const user = res.locals.user as UserSessionInfo;

      await this.deleteGardenInput.execute(
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
