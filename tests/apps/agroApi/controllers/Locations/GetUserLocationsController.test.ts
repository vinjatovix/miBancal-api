import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { GetUserLocationsController } from '../../../../../src/apps/agroApi/controllers/Locations/GetUserLocationsController.js';
import { listLocationsRequest } from '../../../../../src/apps/agroApi/controllers/Locations/requestSchemas.js';
import { ListUserLocations } from '../../../../../src/Contexts/Agro/Locations/application/useCases/ListUserLocations.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { LocationRepositoryMock } from '../../../../Contexts/Agro/Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../../Contexts/Agro/Locations/domain/mothers/LocationFactory.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('GetUserLocationsController', () => {
  const sessionUser: UserSessionInfo = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'gardener',
    email: 'gardener@example.com',
    roles: ['user']
  };

  let repository: LocationRepositoryMock;
  let controller: GetUserLocationsController;

  beforeEach(() => {
    repository = new LocationRepositoryMock();
    controller = new GetUserLocationsController({
      listUserLocations: new ListUserLocations({
        locationRepository: repository
      })
    });
  });

  it('returns 200 with paginated active locations containing coordinates', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(sessionUser.id),
      latitude: 40.4168,
      longitude: -3.7038
    });
    repository.addToStorage(location);

    const req = buildRequest({ query: {} });
    const { res, status, json } = buildResponse({
      user: sessionUser
    });
    const next = buildNext();

    await runWithValidation(listLocationsRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(json).toHaveBeenCalledWith({
      data: [
        {
          id: location.id,
          name: location.name,
          latitude: 40.4168,
          longitude: -3.7038,
          createdAt: location.metadata.createdAt,
          createdBy: location.metadata.createdBy,
          updatedAt: location.metadata.updatedAt,
          updatedBy: location.metadata.updatedBy
        }
      ],
      pagination: {
        totalItems: 1,
        page: 1,
        limit: 25,
        totalPages: 1
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when use case execution fails', async () => {
    const error = new Error('Database read failure');
    jest.spyOn(repository, 'findAll').mockRejectedValueOnce(error);

    const req = buildRequest({ query: {} });
    const { res } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await runWithValidation(listLocationsRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const req = buildRequest({ query: {} });
    const { res } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
