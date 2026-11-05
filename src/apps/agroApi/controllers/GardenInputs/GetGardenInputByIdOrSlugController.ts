import { type NextFunction, type Request, type Response } from 'express';

import type { GetGardenInputByIdOrSlug } from '../../../../Contexts/Agro/GardenInputs/application/useCases/GetGardenInputByIdOrSlug.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkResponse } from '../../shared/responseValidation.js';
import {
  isFullRepresentation,
  setVersionETag
} from '../../shared/versionTags.js';
import { getGardenInputByIdOrSlugRequest } from './requestSchemas.js';
import {
  gardenInputFieldsetResponseSchema,
  gardenInputResponseSchema
} from './responseSchemas.js';

export type GetGardenInputByIdOrSlugControllerDependencies = {
  getGardenInputByIdOrSlug: GetGardenInputByIdOrSlug;
  logger: AppLogger;
};

export class GetGardenInputByIdOrSlugController extends HttpController {
  protected readonly getGardenInputByIdOrSlug: GetGardenInputByIdOrSlug;
  private readonly logger: AppLogger;

  constructor({
    getGardenInputByIdOrSlug,
    logger
  }: GetGardenInputByIdOrSlugControllerDependencies) {
    super();
    this.getGardenInputByIdOrSlug = getGardenInputByIdOrSlug;
    this.logger = logger;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        params: { idOrSlug },
        query
      } = getValidatedRequest(res, getGardenInputByIdOrSlugRequest);
      const user = res.locals.user as UserSessionInfo | undefined;

      const gardenInput = await this.getGardenInputByIdOrSlug.execute(
        idOrSlug,
        user,
        query
      );
      const context = {
        resource: 'GardenInput' as const,
        id: gardenInput.id,
        logger: this.logger
      };

      if (!isFullRepresentation(query)) {
        res
          .status(this.status())
          .json(
            checkResponse(
              gardenInputFieldsetResponseSchema(query.fields),
              gardenInput,
              context
            )
          );
        return;
      }

      const body = checkResponse(
        gardenInputResponseSchema,
        gardenInput,
        context
      );

      setVersionETag(res, body.version);
      res.status(this.status()).json(body);
    } catch (error) {
      next(error);
    }
  };
}
