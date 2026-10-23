import type { NextFunction } from 'express';
import httpStatus from 'http-status';
import { unlikePlantRequest } from '../../../../../src/apps/agroApi/controllers/PlantLikes/requestSchemas.js';
import { UnlikePlantController } from '../../../../../src/apps/agroApi/controllers/PlantLikes/UnlikePlantController.js';
import type { UnlikePlant } from '../../../../../src/Contexts/Agro/PlantLikes/application/useCases/UnlikePlant.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('UnlikePlantController', () => {
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const plantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';

  it('answers 204 No Content when the unlike succeeds', async () => {
    const unlikePlant = {
      execute: jest.fn().mockResolvedValue(undefined)
    } as unknown as UnlikePlant;
    const controller = new UnlikePlantController({ unlikePlant });
    const req = buildRequest({ params: { plantId } });
    const { res, status, send } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(unlikePlantRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.NO_CONTENT);
    expect(send).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a use case error to next', async () => {
    const error = new Error('Database error');
    const unlikePlant = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as UnlikePlant;
    const controller = new UnlikePlantController({ unlikePlant });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(unlikePlantRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards an internal error to next when validation did not run', async () => {
    const unlikePlant = { execute: jest.fn() } as unknown as UnlikePlant;
    const controller = new UnlikePlantController({ unlikePlant });
    const req = buildRequest({ params: { plantId } });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
