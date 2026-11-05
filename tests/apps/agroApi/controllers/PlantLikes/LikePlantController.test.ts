import type { NextFunction } from 'express';
import { LikePlantController } from '../../../../../src/apps/agroApi/controllers/PlantLikes/LikePlantController.js';
import { likePlantRequest } from '../../../../../src/apps/agroApi/controllers/PlantLikes/requestSchemas.js';
import type { LikePlant } from '../../../../../src/Contexts/Agro/PlantLikes/application/useCases/LikePlant.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('LikePlantController', () => {
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const plantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';
  const likeItem = { plantId, likedAt: '2026-10-23T14:30:00.000Z' };

  it('answers 201 Created with the like item on a first like', async () => {
    const likePlant = {
      execute: jest.fn().mockResolvedValue({ item: likeItem, status: 201 })
    } as unknown as LikePlant;
    const controller = new LikePlantController({ likePlant });
    const req = buildRequest({ params: { plantId } });
    const { res, status, json } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(likePlantRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(likeItem);
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 200 OK with the like item on an idempotent repeat', async () => {
    const likePlant = {
      execute: jest.fn().mockResolvedValue({ item: likeItem, status: 200 })
    } as unknown as LikePlant;
    const controller = new LikePlantController({ likePlant });
    const req = buildRequest({ params: { plantId } });
    const { res, status, json } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(likePlantRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(likeItem);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a use case error to next', async () => {
    const error = new Error('Database down');
    const likePlant = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as LikePlant;
    const controller = new LikePlantController({ likePlant });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(likePlantRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards an internal error to next when validation did not run', async () => {
    const likePlant = { execute: jest.fn() } as unknown as LikePlant;
    const controller = new LikePlantController({ likePlant });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
