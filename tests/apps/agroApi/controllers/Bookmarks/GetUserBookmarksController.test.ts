import type { NextFunction } from 'express';
import { GetUserBookmarksController } from '../../../../../src/apps/agroApi/controllers/Bookmarks/GetUserBookmarksController.js';
import { getUserBookmarksRequest } from '../../../../../src/apps/agroApi/controllers/Bookmarks/requestSchemas.js';
import type { GetUserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/application/useCases/GetUserBookmarks.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('GetUserBookmarksController', () => {
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  it('answers 200 OK with bookmarks collection', async () => {
    const expectedResponse = { plants: [] };
    const getUserBookmarks = {
      execute: jest.fn().mockResolvedValue(expectedResponse)
    } as unknown as GetUserBookmarks;
    const controller = new GetUserBookmarksController({ getUserBookmarks });
    const req = buildRequest({ query: {} });
    const { res, status, json } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(getUserBookmarksRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expectedResponse);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when use case execution fails', async () => {
    const error = new Error('Repository error');
    const getUserBookmarks = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as GetUserBookmarks;
    const controller = new GetUserBookmarksController({ getUserBookmarks });
    const req = buildRequest({ query: {} });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(getUserBookmarksRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const getUserBookmarks = {
      execute: jest.fn()
    } as unknown as GetUserBookmarks;
    const controller = new GetUserBookmarksController({ getUserBookmarks });
    const req = buildRequest({ query: {} });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
