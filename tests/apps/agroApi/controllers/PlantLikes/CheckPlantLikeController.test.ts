import type { NextFunction } from 'express';
import httpStatus from 'http-status';
import { CheckPlantLikeController } from '../../../../../src/apps/agroApi/controllers/PlantLikes/CheckPlantLikeController.js';
import { checkPlantLikeRequest } from '../../../../../src/apps/agroApi/controllers/PlantLikes/requestSchemas.js';
import type { CheckPlantLike } from '../../../../../src/Contexts/Agro/PlantLikes/application/useCases/CheckPlantLike.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('CheckPlantLikeController', () => {
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const plantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';

  it.each([
    ['a liked plant', { liked: true, likedAt: '2026-10-23T14:30:00.000Z' }],
    ['an unliked plant', { liked: false }]
  ])(
    'answers 200 OK with the like state for %s, keyed by the session user',
    async (_label, response) => {
      const execute = jest.fn().mockResolvedValue(response);
      const checkPlantLike = { execute } as unknown as CheckPlantLike;
      const controller = new CheckPlantLikeController({ checkPlantLike });
      const req = buildRequest({ params: { plantId } });
      const { res, status, json } = buildResponse({ user });
      const next = buildNext();

      await runWithValidation(checkPlantLikeRequest, req, res);
      await controller.run(req, res, next as NextFunction);

      expect(status).toHaveBeenCalledWith(httpStatus.OK);
      expect(json).toHaveBeenCalledWith(response);
      expect(execute).toHaveBeenCalledWith(plantId, user);
      expect(next).not.toHaveBeenCalled();
    }
  );

  it('forwards a use case error to next', async () => {
    const error = new Error('Database error');
    const checkPlantLike = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as CheckPlantLike;
    const controller = new CheckPlantLikeController({ checkPlantLike });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(checkPlantLikeRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards an internal error to next when validation did not run', async () => {
    const checkPlantLike = { execute: jest.fn() } as unknown as CheckPlantLike;
    const controller = new CheckPlantLikeController({ checkPlantLike });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
