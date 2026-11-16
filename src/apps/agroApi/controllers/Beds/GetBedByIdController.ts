import { type NextFunction, type Request, type Response } from 'express';

import type { GetBedById } from '../../../../Contexts/Agro/Beds/application/useCases/GetBedById.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { parseBedIncludes } from './bedQueryParser.js';
import { toBedResponse } from './bedResponse.js';
import { getBedByIdRequest } from './requestSchemas.js';

export type GetBedByIdControllerDependencies = {
  getBedById: GetBedById;
};

export class GetBedByIdController extends HttpController {
  protected readonly getBedById: GetBedById;

  constructor({ getBedById }: GetBedByIdControllerDependencies) {
    super();
    this.getBedById = getBedById;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params, query } = getValidatedRequest(res, getBedByIdRequest);
      const user = res.locals.user as UserSessionInfo;

      const { embedCrops, embedLocation } = parseBedIncludes(query.include);
      const bedWithRelations = await this.getBedById.execute(params.id, user, {
        embedCrops,
        embedLocation
      });

      const response = toBedResponse(bedWithRelations);

      // ETag is omitted whenever any include is requested (FR-015)
      if (!query.include) {
        setVersionETag(res, response.version);
      }

      res.status(this.status()).json(response);
    } catch (error) {
      next(error);
    }
  };
}
