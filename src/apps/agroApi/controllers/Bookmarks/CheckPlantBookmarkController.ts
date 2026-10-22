import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { CheckPlantBookmark } from '../../../../Contexts/Agro/Bookmarks/application/useCases/CheckPlantBookmark.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { checkPlantBookmarkRequest } from './requestSchemas.js';

export type CheckPlantBookmarkControllerDependencies = {
  checkPlantBookmark: CheckPlantBookmark;
};

export class CheckPlantBookmarkController extends HttpController {
  private readonly checkPlantBookmark: CheckPlantBookmark;

  constructor({
    checkPlantBookmark
  }: CheckPlantBookmarkControllerDependencies) {
    super();
    this.checkPlantBookmark = checkPlantBookmark;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, checkPlantBookmarkRequest);
      const user = res.locals.user as UserSessionInfo;

      const response = await this.checkPlantBookmark.execute(
        params.plantId,
        user
      );

      res.status(httpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}
