import { type NextFunction, type Request, type Response } from 'express';

import type {
  UpdateGardenInput,
  UpdateGardenInputInput
} from '../../../../Contexts/Agro/GardenInputs/application/useCases/index.js';
import { gardenInputDomainMapper } from '../../../../Contexts/Agro/GardenInputs/mappers/gardenInputDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { updateGardenInputRequest } from './requestSchemas.js';

export type UpdateGardenInputControllerDependencies = {
  updateGardenInput: UpdateGardenInput;
};

export class UpdateGardenInputController extends HttpController {
  protected readonly updateGardenInput: UpdateGardenInput;

  constructor({ updateGardenInput }: UpdateGardenInputControllerDependencies) {
    super();
    this.updateGardenInput = updateGardenInput;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        params: { idOrSlug },
        body: dto
      } = getValidatedRequest(res, updateGardenInputRequest);

      const user = res.locals.user as UserSessionInfo;

      const input: UpdateGardenInputInput = { ...dto, idOrSlug };
      const updatedGardenInput = await this.updateGardenInput.execute(
        input,
        user.username,
        getExpectedVersions(res)
      );
      const result = gardenInputDomainMapper.toPrimitives(updatedGardenInput);

      setVersionETag(res, result.version);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
