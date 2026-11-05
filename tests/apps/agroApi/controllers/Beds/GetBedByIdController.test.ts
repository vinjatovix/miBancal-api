import { beforeEach, describe, expect, it } from '@jest/globals';
import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { GetBedByIdController } from '../../../../../src/apps/agroApi/controllers/Beds/GetBedByIdController.js';
import { getBedByIdRequest } from '../../../../../src/apps/agroApi/controllers/Beds/requestSchemas.js';
import type { GetBedById } from '../../../../../src/Contexts/Agro/Beds/application/useCases/GetBedById.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { BedFactory } from '../../../../Contexts/Agro/Beds/domain/mothers/BedFactory.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('GetBedByIdController', () => {
  const sessionUser: UserSessionInfo = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'gardener',
    email: 'gardener@example.com',
    roles: ['user']
  };

  let getBedByIdMock: jest.Mocked<Pick<GetBedById, 'execute'>>;
  let controller: GetBedByIdController;

  beforeEach(() => {
    getBedByIdMock = {
      execute: jest.fn()
    };
    controller = new GetBedByIdController({
      getBedById: getBedByIdMock as unknown as GetBedById
    });
  });

  it('sets ETag header when include parameter is not present', async () => {
    const bed = BedFactory.create({
      userId: createUserId(sessionUser.id),
      version: 1
    });
    getBedByIdMock.execute.mockResolvedValue({
      bed,
      cropIds: []
    });

    const req = buildRequest({ params: { id: bed.id } });
    const { res, status, set } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await runWithValidation(getBedByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(set).toHaveBeenCalledWith('ETag', '"1"');
  });

  it('omits ETag header when include=location is requested', async () => {
    const bed = BedFactory.create({
      userId: createUserId(sessionUser.id),
      version: 1
    });
    getBedByIdMock.execute.mockResolvedValue({
      bed,
      cropIds: [],
      location: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Parcela Norte',
        latitude: 40.4168,
        longitude: -3.7038
      }
    });

    const req = buildRequest({
      params: { id: bed.id },
      query: { include: 'location' }
    });
    const { res, status, set } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await runWithValidation(getBedByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(set).not.toHaveBeenCalledWith('ETag', expect.anything());
    expect(getBedByIdMock.execute).toHaveBeenCalledWith(bed.id, sessionUser, {
      embedCrops: false,
      embedLocation: true
    });
  });

  it('forwards error to next when use case execution rejects', async () => {
    const error = new Error('Database down');
    getBedByIdMock.execute.mockRejectedValue(error);

    const req = buildRequest({
      params: { id: '11111111-1111-4111-8111-111111111111' }
    });
    const { res } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await runWithValidation(getBedByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });
});
