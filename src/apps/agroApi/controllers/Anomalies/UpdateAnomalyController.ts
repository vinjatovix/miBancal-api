import { type NextFunction, type Request, type Response } from 'express';

import type { UpdateAnomalyInput } from '../../../../Contexts/Agro/Anomalies/application/useCases/interfaces/index.js';
import type { UpdateAnomaly } from '../../../../Contexts/Agro/Anomalies/application/useCases/UpdateAnomaly.js';
import { anomalyDomainMapper } from '../../../../Contexts/Agro/Anomalies/mappers/anomalyDomainMapper.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import {
  getExpectedVersions,
  setVersionETag
} from '../../shared/versionTags.js';
import { updateAnomalyRequest } from './requestSchemas.js';

export type UpdateAnomalyControllerDependencies = {
  updateAnomaly: UpdateAnomaly;
};

export class UpdateAnomalyController extends HttpController {
  protected readonly updateAnomaly: UpdateAnomaly;

  constructor({ updateAnomaly }: UpdateAnomalyControllerDependencies) {
    super();
    this.updateAnomaly = updateAnomaly;
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
      } = getValidatedRequest(res, updateAnomalyRequest);

      const user = res.locals.user as UserSessionInfo;

      const input: UpdateAnomalyInput = { ...dto, idOrSlug };
      const updatedAnomaly = await this.updateAnomaly.execute(
        input,
        user.username,
        getExpectedVersions(res)
      );
      const result = anomalyDomainMapper.toPrimitives(updatedAnomaly);

      setVersionETag(res, result.version);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
