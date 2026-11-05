import type { NextFunction } from 'express';
import { AddPlantBookmarkController } from '../../../../../src/apps/agroApi/controllers/Bookmarks/AddPlantBookmarkController.js';
import { addPlantBookmarkRequest } from '../../../../../src/apps/agroApi/controllers/Bookmarks/requestSchemas.js';
import type { AddPlantBookmark } from '../../../../../src/Contexts/Agro/Bookmarks/application/useCases/AddPlantBookmark.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('AddPlantBookmarkController', () => {
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const plantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';
  const bookmarkItem = {
    plantId,
    bookmarkedAt: '2026-10-22T14:30:00.000Z'
  };

  it('answers 201 Created with bookmark item when newly added', async () => {
    const addPlantBookmark = {
      execute: jest.fn().mockResolvedValue({ item: bookmarkItem, status: 201 })
    } as unknown as AddPlantBookmark;
    const controller = new AddPlantBookmarkController({ addPlantBookmark });
    const req = buildRequest({ body: { plantId } });
    const { res, status, json } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(addPlantBookmarkRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(bookmarkItem);
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 200 OK with bookmark item when bookmark already exists', async () => {
    const addPlantBookmark = {
      execute: jest.fn().mockResolvedValue({ item: bookmarkItem, status: 200 })
    } as unknown as AddPlantBookmark;
    const controller = new AddPlantBookmarkController({ addPlantBookmark });
    const req = buildRequest({ body: { plantId } });
    const { res, status, json } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(addPlantBookmarkRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(bookmarkItem);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when use case execution fails', async () => {
    const error = new Error('Database down');
    const addPlantBookmark = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as AddPlantBookmark;
    const controller = new AddPlantBookmarkController({ addPlantBookmark });
    const req = buildRequest({ body: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(addPlantBookmarkRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const addPlantBookmark = {
      execute: jest.fn()
    } as unknown as AddPlantBookmark;
    const controller = new AddPlantBookmarkController({ addPlantBookmark });
    const req = buildRequest({ body: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
