import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { CreateGardenInput } from '../../../../Contexts/Agro/GardenInputs/application/useCases/CreateGardenInput.js';
import { gardenInputDomainMapper } from '../../../../Contexts/Agro/GardenInputs/mappers/gardenInputDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { createGardenInputRequest } from './requestSchemas.js';

export type CreateGardenInputControllerDependencies = {
  createGardenInput: CreateGardenInput;
};

export class CreateGardenInputController extends HttpController {
  protected readonly createGardenInput: CreateGardenInput;

  constructor({ createGardenInput }: CreateGardenInputControllerDependencies) {
    super();
    this.createGardenInput = createGardenInput;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(res, createGardenInputRequest);
      const user = res.locals.user as UserSessionInfo;

      const gardenInput = await this.createGardenInput.execute(
        dto,
        user.username
      );
      const result = gardenInputDomainMapper.toPrimitives(gardenInput);

      setVersionETag(res, result.version);
      res.status(httpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };
}
