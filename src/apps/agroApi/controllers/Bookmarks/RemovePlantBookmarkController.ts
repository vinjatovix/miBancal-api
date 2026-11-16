import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { RemovePlantBookmark } from '../../../../Contexts/Agro/Bookmarks/application/useCases/RemovePlantBookmark.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { removePlantBookmarkRequest } from './requestSchemas.js';

export type RemovePlantBookmarkControllerDependencies = {
  removePlantBookmark: RemovePlantBookmark;
};

export class RemovePlantBookmarkController extends HttpController {
  private readonly removePlantBookmark: RemovePlantBookmark;

  constructor({
    removePlantBookmark
  }: RemovePlantBookmarkControllerDependencies) {
    super();
    this.removePlantBookmark = removePlantBookmark;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { params } = getValidatedRequest(res, removePlantBookmarkRequest);
      const user = res.locals.user as UserSessionInfo;

      await this.removePlantBookmark.execute(params.plantId, user);

      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      next(error);
    }
  };
}
