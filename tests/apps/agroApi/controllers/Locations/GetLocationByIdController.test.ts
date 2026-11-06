import { beforeEach, describe, expect, it } from '@jest/globals';
import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { GetLocationByIdController } from '../../../../../src/apps/agroApi/controllers/Locations/GetLocationByIdController.js';
import { getLocationByIdRequest } from '../../../../../src/apps/agroApi/controllers/Locations/requestSchemas.js';
import { GetLocationById } from '../../../../../src/Contexts/Agro/Locations/application/useCases/GetLocationById.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { BedRepositoryMock } from '../../../../Contexts/Agro/Beds/__mocks__/BedRepositoryMock.js';
import { LocationRepositoryMock } from '../../../../Contexts/Agro/Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../../Contexts/Agro/Locations/domain/mothers/LocationFactory.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('GetLocationByIdController', () => {
  const sessionUser: UserSessionInfo = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'gardener',
    email: 'gardener@example.com',
    roles: ['user']
  };

  let repository: LocationRepositoryMock;
  let bedRepository: BedRepositoryMock;
  let controller: GetLocationByIdController;

  beforeEach(() => {
    repository = new LocationRepositoryMock();
    bedRepository = new BedRepositoryMock();
    controller = new GetLocationByIdController({
      getLocationById: new GetLocationById({
        locationRepository: repository,
        bedRepository
      })
    });
  });

  it('returns 200, exact LocationResponse with coordinates, and strong ETag', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(sessionUser.id),
      latitude: 40.4168,
      longitude: -3.7038,
      version: 2
    });
    repository.addToStorage(location);

    const req = buildRequest({ params: { id: location.id } });
    const { res, status, json, set } = buildResponse({
      user: sessionUser
    });
    const next = buildNext();

    await runWithValidation(getLocationByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(set).toHaveBeenCalledWith('ETag', '"2"');
    expect(json).toHaveBeenCalledWith({
      id: location.id,
      name: location.name,
      latitude: 40.4168,
      longitude: -3.7038,
      createdAt: location.metadata.createdAt,
      createdBy: location.metadata.createdBy,
      updatedAt: location.metadata.updatedAt,
      updatedBy: location.metadata.updatedBy
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('embeds beds summary and omits ETag header when include=beds is requested', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(sessionUser.id),
      version: 2
    });
    repository.addToStorage(location);

    const req = buildRequest({
      params: { id: location.id },
      query: { include: 'beds' }
    });
    const { res, status, json, set } = buildResponse({
      user: sessionUser
    });
    const next = buildNext();

    await runWithValidation(getLocationByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(set).not.toHaveBeenCalledWith('ETag', expect.anything());
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: location.id,
        beds: []
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when location is not found', async () => {
    const req = buildRequest({
      params: { id: '22222222-2222-4222-8222-222222222222' }
    });
    const { res } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await runWithValidation(getLocationByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(DomainNotFoundException));
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const req = buildRequest({
      params: { id: '22222222-2222-4222-8222-222222222222' }
    });
    const { res } = buildResponse({ user: sessionUser });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
