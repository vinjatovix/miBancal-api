import type { NextFunction } from 'express';
import { updatePlantRelationRequest } from '../../../../../src/apps/agroApi/controllers/PlantRelations/requestSchemas.js';
import { UpdatePlantRelationController } from '../../../../../src/apps/agroApi/controllers/PlantRelations/UpdatePlantRelationController.js';
import { storeExpectedVersions } from '../../../../../src/apps/agroApi/shared/versionTags.js';
import type { UpdatePlantRelation } from '../../../../../src/Contexts/Agro/PlantRelations/application/useCases/UpdatePlantRelation.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';
import { PlantRelationMother } from '../../../../Contexts/Agro/PlantRelations/domain/mothers/PlantRelationMother.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('UpdatePlantRelationController', () => {
  const fakeLogger: AppLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'curator',
    roles: ['collaborator'],
    email: 'curator@example.com'
  };

  const validBody = {
    mechanism: 'pest_repellent' as const,
    strength: 5,
    reason: 'Updated reason'
  };

  it('answers 200 OK and emits strong ETag header', async () => {
    const relation = PlantRelationMother.create({
      mechanism: validBody.mechanism,
      strength: validBody.strength,
      reason: validBody.reason,
      user: user.username
    });

    const executeSpy = jest.fn().mockResolvedValue(relation);
    const updatePlantRelation = {
      execute: executeSpy
    } as unknown as UpdatePlantRelation;

    const controller = new UpdatePlantRelationController({
      updatePlantRelation,
      logger: fakeLogger
    });

    const req = buildRequest({
      params: { id: relation.id },
      body: validBody
    });
    const { res, status, json, set } = buildResponse({ user });
    storeExpectedVersions(res, [relation.version]);
    const next = buildNext();

    await runWithValidation(updatePlantRelationRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(200);
    expect(set).toHaveBeenCalledWith('ETag', `"${relation.version}"`);
    expect(json).toHaveBeenCalledWith({
      id: relation.id,
      source: relation.source.toPrimitives(),
      target: relation.target.toPrimitives(),
      sourcePlantId: relation.sourcePlantId,
      targetPlantId: relation.targetPlantId,
      type: relation.type,
      mechanism: relation.mechanism,
      strength: relation.strength,
      proximity: relation.proximity.toPrimitives(),
      reason: relation.reason,
      metadata: {
        createdAt: relation.metadata.createdAt,
        createdBy: relation.metadata.createdBy,
        updatedAt: relation.metadata.updatedAt,
        updatedBy: relation.metadata.updatedBy
      },
      version: relation.version
    });
    expect(next).not.toHaveBeenCalled();
    expect(executeSpy).toHaveBeenCalledWith(
      {
        id: relation.id,
        mechanism: validBody.mechanism,
        strength: validBody.strength,
        reason: validBody.reason
      },
      user.username,
      [relation.version]
    );
  });

  it('forwards error to next when use case fails', async () => {
    const error = new Error('Update failure');
    const updatePlantRelation = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as UpdatePlantRelation;

    const controller = new UpdatePlantRelationController({
      updatePlantRelation,
      logger: fakeLogger
    });

    const req = buildRequest({
      params: { id: '0192e200-0000-7000-8000-000000000001' },
      body: validBody
    });
    const { res } = buildResponse({ user });
    storeExpectedVersions(res, [1]);
    const next = buildNext();

    await runWithValidation(updatePlantRelationRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const updatePlantRelation = {
      execute: jest.fn()
    } as unknown as UpdatePlantRelation;

    const controller = new UpdatePlantRelationController({
      updatePlantRelation,
      logger: fakeLogger
    });

    const req = buildRequest({
      params: { id: '0192e200-0000-7000-8000-000000000001' },
      body: validBody
    });
    const { res } = buildResponse({ user });
    storeExpectedVersions(res, [1]);
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
