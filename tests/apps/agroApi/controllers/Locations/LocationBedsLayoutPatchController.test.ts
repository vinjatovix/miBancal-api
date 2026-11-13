import { beforeEach, describe, expect, it } from '@jest/globals';
import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { LocationBedsLayoutPatchController } from '../../../../../src/apps/agroApi/controllers/Locations/LocationBedsLayoutPatchController.js';
import { updateLocationBedsLayoutRequest } from '../../../../../src/apps/agroApi/controllers/Locations/requestSchemas.js';
import { UpdateLocationBedsLayout } from '../../../../../src/Contexts/Agro/Locations/application/useCases/UpdateLocationBedsLayout.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { PositiveNumber } from '../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { BedRepositoryMock } from '../../../../Contexts/Agro/Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../../Contexts/Agro/Beds/domain/mothers/BedFactory.js';
import { LocationRepositoryMock } from '../../../../Contexts/Agro/Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../../Contexts/Agro/Locations/domain/mothers/LocationFactory.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('LocationBedsLayoutPatchController', () => {
  const sessionUser: UserSessionInfo = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'gardener',
    email: 'gardener@example.com',
    roles: ['user']
  };

  let locationRepository: LocationRepositoryMock;
  let bedRepository: BedRepositoryMock;
  let controller: LocationBedsLayoutPatchController;

  beforeEach(() => {
    locationRepository = new LocationRepositoryMock();
    bedRepository = new BedRepositoryMock();
    const updateLocationBedsLayout = new UpdateLocationBedsLayout({
      locationRepository,
      bedRepository
    });
    controller = new LocationBedsLayoutPatchController({
      updateLocationBedsLayout
    });
  });

  it('returns 204 No Content with updated Location ETag when layout is successfully persisted', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(sessionUser.id),
      version: 0
    });
    locationRepository.addToStorage(location);

    const bed = BedFactory.create({
      userId: createUserId(sessionUser.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100)
    });
    bedRepository.addToStorage(bed);

    const req = buildRequest({
      params: { id: location.id },
      body: [
        {
          id: bed.id,
          position: { x: 50, y: 50 },
          rotation: 0
        }
      ]
    });
    const { res, status, send, set } = buildResponse({
      user: sessionUser,
      expectedVersions: [0]
    });
    const next = buildNext();

    await runWithValidation(updateLocationBedsLayoutRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.NO_CONTENT);
    expect(set).toHaveBeenCalledWith('ETag', '"1"');
    expect(send).toHaveBeenCalled();
  });

  it('forwards error to next when location is not found', async () => {
    const req = buildRequest({
      params: { id: '22222222-2222-4222-8222-222222222222' },
      body: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          position: { x: 10, y: 10 },
          rotation: 0
        }
      ]
    });
    const { res } = buildResponse({
      user: sessionUser,
      expectedVersions: [0]
    });
    const next = buildNext();

    await runWithValidation(updateLocationBedsLayoutRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(DomainNotFoundException));
  });
});
