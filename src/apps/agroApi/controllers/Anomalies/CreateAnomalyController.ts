import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';

import type { CreateAnomaly } from '../../../../Contexts/Agro/Anomalies/application/useCases/CreateAnomaly.js';
import { anomalyDomainMapper } from '../../../../Contexts/Agro/Anomalies/mappers/anomalyDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { setVersionETag } from '../../shared/versionTags.js';
import { createAnomalyRequest } from './requestSchemas.js';

export type CreateAnomalyControllerDependencies = {
  createAnomaly: CreateAnomaly;
};

export class CreateAnomalyController extends HttpController {
  protected readonly createAnomaly: CreateAnomaly;

  constructor({ createAnomaly }: CreateAnomalyControllerDependencies) {
    super();
    this.createAnomaly = createAnomaly;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(res, createAnomalyRequest);
      const user = res.locals.user as UserSessionInfo;

      const anomaly = await this.createAnomaly.execute(dto, user.username);
      const result = anomalyDomainMapper.toPrimitives(anomaly);

      setVersionETag(res, result.version);
      res.status(httpStatus.CREATED).json(result);
    } catch (error) {
      next(error);
    }
  };
}
