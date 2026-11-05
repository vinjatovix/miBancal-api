import { type NextFunction, type Request, type Response } from 'express';

import type { GetAnomalyBySlug } from '../../../../Contexts/Agro/Anomalies/application/useCases/GetAnomalyBySlug.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import type { AppLogger } from '../../../../Contexts/shared/plugins/logger.plugin.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkResponse } from '../../shared/responseValidation.js';
import {
  isFullRepresentation,
  setVersionETag
} from '../../shared/versionTags.js';
import { getAnomalyByIdOrSlugRequest } from './requestSchemas.js';
import {
  anomalyFieldsetResponseSchema,
  anomalyResponseSchema
} from './responseSchemas.js';

export type GetAnomalyBySlugControllerDependencies = {
  getAnomalyBySlug: GetAnomalyBySlug;
  logger: AppLogger;
};

export class GetAnomalyBySlugController extends HttpController {
  protected readonly getAnomalyBySlug: GetAnomalyBySlug;
  private readonly logger: AppLogger;

  constructor({
    getAnomalyBySlug,
    logger
  }: GetAnomalyBySlugControllerDependencies) {
    super();
    this.getAnomalyBySlug = getAnomalyBySlug;
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
      } = getValidatedRequest(res, getAnomalyByIdOrSlugRequest);
      const user = res.locals.user as UserSessionInfo | undefined;

      const anomaly = await this.getAnomalyBySlug.execute(
        idOrSlug,
        user,
        query
      );
      const context = {
        resource: 'Anomaly' as const,
        id: anomaly.id,
        logger: this.logger
      };

      // A tailored body is not the representation the version names: no ETag.
      if (!isFullRepresentation(query)) {
        res
          .status(this.status())
          .json(
            checkResponse(
              anomalyFieldsetResponseSchema(query.fields),
              anomaly,
              context
            )
          );
        return;
      }

      const body = checkResponse(anomalyResponseSchema, anomaly, context);

      setVersionETag(res, body.version);
      res.status(this.status()).json(body);
    } catch (error) {
      next(error);
    }
  };
}
