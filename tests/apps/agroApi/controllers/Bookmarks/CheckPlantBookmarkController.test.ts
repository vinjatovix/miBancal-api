import type { NextFunction } from 'express';
import { CheckPlantBookmarkController } from '../../../../../src/apps/agroApi/controllers/Bookmarks/CheckPlantBookmarkController.js';
import { checkPlantBookmarkRequest } from '../../../../../src/apps/agroApi/controllers/Bookmarks/requestSchemas.js';
import type { CheckPlantBookmark } from '../../../../../src/Contexts/Agro/Bookmarks/application/useCases/CheckPlantBookmark.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('CheckPlantBookmarkController', () => {
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const plantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';

  it('answers 200 OK with check response when found', async () => {
    const expectedResponse = {
      bookmarked: true,
      bookmarkedAt: '2026-10-22T14:30:00.000Z'
    };
    const checkPlantBookmark = {
      execute: jest.fn().mockResolvedValue(expectedResponse)
    } as unknown as CheckPlantBookmark;
    const controller = new CheckPlantBookmarkController({ checkPlantBookmark });
    const req = buildRequest({ params: { plantId } });
    const { res, status, json } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(checkPlantBookmarkRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(expectedResponse);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when use case execution fails', async () => {
    const error = new Error('Database down');
    const checkPlantBookmark = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as CheckPlantBookmark;
    const controller = new CheckPlantBookmarkController({ checkPlantBookmark });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(checkPlantBookmarkRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const checkPlantBookmark = {
      execute: jest.fn()
    } as unknown as CheckPlantBookmark;
    const controller = new CheckPlantBookmarkController({ checkPlantBookmark });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
