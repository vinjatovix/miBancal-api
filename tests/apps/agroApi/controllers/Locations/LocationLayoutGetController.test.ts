import { beforeEach, describe, expect, it } from '@jest/globals';
import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { LocationLayoutGetController } from '../../../../../src/apps/agroApi/controllers/Locations/LocationLayoutGetController.js';
import { getLocationLayoutRequest } from '../../../../../src/apps/agroApi/controllers/Locations/requestSchemas.js';
import { GetLocationLayout } from '../../../../../src/Contexts/Agro/Locations/application/useCases/GetLocationLayout.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { BedRepositoryMock } from '../../../../Contexts/Agro/Beds/__mocks__/BedRepositoryMock.js';
import { LocationRepositoryMock } from '../../../../Contexts/Agro/Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../../Contexts/Agro/Locations/domain/mothers/LocationFactory.js';
import { PlantInstanceRepositoryMock } from '../../../../Contexts/Agro/PlantInstances/__mocks__/PlantInstanceRepositoryMock.js';
import { PlantRelationRepositoryMock } from '../../../../Contexts/Agro/PlantRelations/__mocks__/PlantRelationRepositoryMock.js';
import { PlantRepositoryMock } from '../../../../Contexts/Agro/Plants/__mocks__/PlantRepositoryMock.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('LocationLayoutGetController', () => {
  const sessionUser: UserSessionInfo = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'gardener',
    email: 'gardener@example.com',
    roles: ['user']
  };

  let locationRepository: LocationRepositoryMock;
  let bedRepository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let plantRepository: PlantRepositoryMock;
  let plantRelationRepository: PlantRelationRepositoryMock;
  let controller: LocationLayoutGetController;

  beforeEach(() => {
    locationRepository = new LocationRepositoryMock();
    bedRepository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    plantRepository = new PlantRepositoryMock();
    plantRelationRepository = new PlantRelationRepositoryMock();

    const getLocationLayout = new GetLocationLayout({
      locationRepository,
      bedRepository,
      plantInstanceRepository,
      plantRepository,
      plantRelationRepository
    });

    controller = new LocationLayoutGetController({
      getLocationLayout
    });
  });

  it('returns 200 with layout representation and strong ETag', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(sessionUser.id),
      version: 3
    });
    locationRepository.addToStorage(location);

    const req = buildRequest({ params: { id: location.id } });
    const { res, status, json, set } = buildResponse({
      user: sessionUser
    });
    const next = buildNext();

    await runWithValidation(getLocationLayoutRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(httpStatus.OK);
    expect(set).toHaveBeenCalledWith('ETag', '"3"');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        location: expect.objectContaining({ id: location.id }),
        placedBeds: [],
        unplacedBeds: [],
        companionGraph: []
      })
    );
  });

  it('forwards error to next when location is not found', async () => {
    const req = buildRequest({
      params: { id: '22222222-2222-4222-8222-222222222222' }
    });
    const { res } = buildResponse({
      user: sessionUser
    });
    const next = buildNext();

    await runWithValidation(getLocationLayoutRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(DomainNotFoundException));
  });
});
