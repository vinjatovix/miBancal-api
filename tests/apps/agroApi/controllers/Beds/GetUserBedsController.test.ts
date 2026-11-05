import { beforeEach, describe, expect, it } from '@jest/globals';
import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { GetUserBedsController } from '../../../../../src/apps/agroApi/controllers/Beds/GetUserBedsController.js';
import { listBedsRequest } from '../../../../../src/apps/agroApi/controllers/Beds/requestSchemas.js';
import type { ListUserBeds } from '../../../../../src/Contexts/Agro/Beds/application/useCases/ListUserBeds.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { BedFactory } from '../../../../Contexts/Agro/Beds/domain/mothers/BedFactory.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('GetUserBedsController', () => {
  const sessionUser: UserSessionInfo = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'gardener',
    email: 'gardener@example.com',
    roles: ['user']
  };

  let listUserBedsMock: jest.Mocked<Pick<ListUserBeds, 'execute'>>;
  let controller: GetUserBedsController;

  beforeEach(() => {
    listUserBedsMock = {
      execute: jest.fn()
    };
    controller = new GetUserBedsController({
      listUserBeds: listUserBedsMock as unknown as ListUserBeds
    });
  });

  it('forwards locationId filter to ListUserBeds', async () => {
    const locationId = '22222222-2222-4222-8222-222222222222';
    listUserBedsMock.execute.mockResolvedValue([]);

    const req = buildRequest({ query: { 'filter[locationId]': locationId } });
    const { res, status, json } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await runWithValidation(listBedsRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(json).toHaveBeenCalledWith([]);
    expect(listUserBedsMock.execute).toHaveBeenCalledWith(
      sessionUser.id,
      { locationId },
      expect.anything()
    );
  });

  it('parses include=location and requests embedLocation', async () => {
    const bed = BedFactory.create({ userId: createUserId(sessionUser.id) });
    listUserBedsMock.execute.mockResolvedValue([
      {
        bed,
        cropIds: [],
        location: {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Parcela Norte',
          latitude: 40.4168,
          longitude: -3.7038
        }
      }
    ]);

    const req = buildRequest({ query: { include: 'location' } });
    const { res, status, json } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await runWithValidation(listBedsRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(listUserBedsMock.execute).toHaveBeenCalledWith(
      sessionUser.id,
      undefined,
      { embedCrops: false, embedLocation: true }
    );
    expect(json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          location: {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Parcela Norte',
            latitude: 40.4168,
            longitude: -3.7038
          }
        })
      ])
    );
  });

  it('forwards error to next when use case execution rejects', async () => {
    const error = new Error('Database down');
    listUserBedsMock.execute.mockRejectedValue(error);

    const req = buildRequest();
    const { res } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await runWithValidation(listBedsRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });
});
