import { type NextFunction, type Request, type Response } from 'express';
import httpStatus from 'http-status';
import type { GetUserBookmarks } from '../../../../Contexts/Agro/Bookmarks/application/useCases/GetUserBookmarks.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { getUserBookmarksRequest } from './requestSchemas.js';

export type GetUserBookmarksControllerDependencies = {
  getUserBookmarks: GetUserBookmarks;
};

export class GetUserBookmarksController extends HttpController {
  private readonly getUserBookmarks: GetUserBookmarks;

  constructor({ getUserBookmarks }: GetUserBookmarksControllerDependencies) {
    super();
    this.getUserBookmarks = getUserBookmarks;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { query } = getValidatedRequest(res, getUserBookmarksRequest);
      const user = res.locals.user as UserSessionInfo;

      const response = await this.getUserBookmarks.execute(query, user);

      res.status(httpStatus.OK).json(response);
    } catch (error) {
      next(error);
    }
  };
}
