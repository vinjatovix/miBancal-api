import type { NextFunction } from 'express';
import httpStatus from 'http-status';
import { RemovePlantBookmarkController } from '../../../../../src/apps/agroApi/controllers/Bookmarks/RemovePlantBookmarkController.js';
import { removePlantBookmarkRequest } from '../../../../../src/apps/agroApi/controllers/Bookmarks/requestSchemas.js';
import type { RemovePlantBookmark } from '../../../../../src/Contexts/Agro/Bookmarks/application/useCases/RemovePlantBookmark.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('RemovePlantBookmarkController', () => {
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const plantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';

  it('answers 204 No Content when plant is removed', async () => {
    const removePlantBookmark = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as unknown as RemovePlantBookmark;
    const controller = new RemovePlantBookmarkController({
      removePlantBookmark
    });
    const req = buildRequest({ params: { plantId } });
    const { res, status, send } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(removePlantBookmarkRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.NO_CONTENT);
    expect(send).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when use case execution fails', async () => {
    const error = new Error('Database error');
    const removePlantBookmark = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as RemovePlantBookmark;
    const controller = new RemovePlantBookmarkController({
      removePlantBookmark
    });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(removePlantBookmarkRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const removePlantBookmark = {
      execute: jest.fn()
    } as unknown as RemovePlantBookmark;
    const controller = new RemovePlantBookmarkController({
      removePlantBookmark
    });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
