import { type NextFunction, type Request, type Response } from 'express';
import type { AddPlantBookmark } from '../../../../Contexts/Agro/Bookmarks/application/useCases/AddPlantBookmark.js';
import type { UserSessionInfo } from '../../../../Contexts/Auth/application/interfaces/index.js';
import { getValidatedRequest } from '../../middlewares/validateRequest.js';
import { HttpController } from '../../shared/HttpController.js';
import { addPlantBookmarkRequest } from './requestSchemas.js';

export type AddPlantBookmarkControllerDependencies = {
  addPlantBookmark: AddPlantBookmark;
};

export class AddPlantBookmarkController extends HttpController {
  private readonly addPlantBookmark: AddPlantBookmark;

  constructor({ addPlantBookmark }: AddPlantBookmarkControllerDependencies) {
    super();
    this.addPlantBookmark = addPlantBookmark;
  }

  run = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { body: dto } = getValidatedRequest(res, addPlantBookmarkRequest);
      const user = res.locals.user as UserSessionInfo;

      const result = await this.addPlantBookmark.execute(dto, user);

      res.status(result.status).json(result.item);
    } catch (error) {
      next(error);
    }
  };
}
