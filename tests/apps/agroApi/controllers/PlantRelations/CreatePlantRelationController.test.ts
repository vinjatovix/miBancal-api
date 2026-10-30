import type { NextFunction } from 'express';
import { CreatePlantRelationController } from '../../../../../src/apps/agroApi/controllers/PlantRelations/CreatePlantRelationController.js';
import { createPlantRelationRequest } from '../../../../../src/apps/agroApi/controllers/PlantRelations/requestSchemas.js';
import type { CreatePlantRelation } from '../../../../../src/Contexts/Agro/PlantRelations/application/useCases/CreatePlantRelation.js';
import { createPlantRelationId } from '../../../../../src/Contexts/Agro/PlantRelations/domain/PlantRelationId.js';
import { ProximityDistance } from '../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { TaxonomicScope } from '../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/TaxonomicScope.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
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

describe('CreatePlantRelationController', () => {
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

  const validLegacyBody = {
    id: '0192e201-0000-7000-8000-000000000001',
    sourcePlantId: '0192e200-0000-7000-8000-000000000001',
    targetPlantId: '0192e200-0000-7000-8000-000000000002',
    type: 'beneficial' as const,
    mechanism: 'pest_repellent' as const,
    strength: 4,
    proximity: {
      minDistanceCm: 0,
      maxDistanceCm: 50
    },
    reason: 'Basil repels hornworms from tomato.'
  };

  const validScopedBody = {
    id: '0192e201-0000-7000-8000-000000000002',
    source: { scope: 'genus' as const, value: 'Tagetes' },
    target: {
      scope: 'family' as const,
      value: '0192e200-0000-7000-8000-000000000010'
    },
    type: 'beneficial' as const,
    mechanism: 'pest_repellent' as const,
    strength: 4,
    proximity: {
      minDistanceCm: 0,
      maxDistanceCm: 100
    },
    reason: 'Tagetes repels nematodes for Solanaceae.'
  };

  it('answers 201 Created and emits strong ETag header for legacy payload', async () => {
    const relation = PlantRelationMother.create({
      id: createPlantRelationId(validLegacyBody.id),
      sourcePlantId: createPlantId(validLegacyBody.sourcePlantId),
      targetPlantId: createPlantId(validLegacyBody.targetPlantId),
      type: validLegacyBody.type,
      mechanism: validLegacyBody.mechanism,
      strength: validLegacyBody.strength,
      proximity: ProximityDistance.create(0, 50),
      reason: validLegacyBody.reason,
      user: user.username
    });

    const createPlantRelation = {
      execute: jest.fn().mockResolvedValue(relation)
    } as unknown as CreatePlantRelation;

    const controller = new CreatePlantRelationController({
      createPlantRelation,
      logger: fakeLogger
    });

    const req = buildRequest({ body: validLegacyBody });
    const { res, status, json, set } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(createPlantRelationRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(201);
    expect(set).toHaveBeenCalledWith('ETag', '"0"');
    expect(json).toHaveBeenCalledWith({
      id: relation.id,
      source: relation.source.toPrimitives(),
      target: relation.target.toPrimitives(),
      sourcePlantId: relation.sourcePlantId,
      targetPlantId: relation.targetPlantId,
      type: relation.type,
      mechanism: relation.mechanism,
      strength: relation.strength,
      proximity: {
        minDistanceCm: 0,
        maxDistanceCm: 50
      },
      reason: relation.reason,
      metadata: {
        createdAt: relation.metadata.createdAt,
        createdBy: user.username,
        updatedAt: relation.metadata.updatedAt,
        updatedBy: user.username
      },
      version: 0
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 201 Created for scoped payload (genus to family)', async () => {
    const relation = PlantRelationMother.scoped(
      TaxonomicScope.genus('Tagetes'),
      TaxonomicScope.family('0192e200-0000-7000-8000-000000000010'),
      {
        id: createPlantRelationId(validScopedBody.id),
        type: validScopedBody.type,
        mechanism: validScopedBody.mechanism,
        strength: validScopedBody.strength,
        proximity: ProximityDistance.create(0, 100),
        reason: validScopedBody.reason,
        user: user.username
      }
    );

    const createPlantRelation = {
      execute: jest.fn().mockResolvedValue(relation)
    } as unknown as CreatePlantRelation;

    const controller = new CreatePlantRelationController({
      createPlantRelation,
      logger: fakeLogger
    });

    const req = buildRequest({ body: validScopedBody });
    const { res, status, json, set } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(createPlantRelationRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(201);
    expect(set).toHaveBeenCalledWith('ETag', '"0"');
    expect(json).toHaveBeenCalledWith({
      id: relation.id,
      source: { scope: 'genus', value: 'Tagetes' },
      target: {
        scope: 'family',
        value: '0192e200-0000-7000-8000-000000000010'
      },
      type: relation.type,
      mechanism: relation.mechanism,
      strength: relation.strength,
      proximity: {
        minDistanceCm: 0,
        maxDistanceCm: 100
      },
      reason: relation.reason,
      metadata: {
        createdAt: relation.metadata.createdAt,
        createdBy: user.username,
        updatedAt: relation.metadata.updatedAt,
        updatedBy: user.username
      },
      version: 0
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when use case fails', async () => {
    const error = new Error('Creation failure');
    const createPlantRelation = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as CreatePlantRelation;

    const controller = new CreatePlantRelationController({
      createPlantRelation,
      logger: fakeLogger
    });

    const req = buildRequest({ body: validLegacyBody });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await runWithValidation(createPlantRelationRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const createPlantRelation = {
      execute: jest.fn()
    } as unknown as CreatePlantRelation;

    const controller = new CreatePlantRelationController({
      createPlantRelation,
      logger: fakeLogger
    });

    const req = buildRequest({ body: validLegacyBody });
    const { res } = buildResponse({ user });
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
