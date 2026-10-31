import type { NextFunction } from 'express';
import { GetPlantRelationByIdController } from '../../../../../src/apps/agroApi/controllers/PlantRelations/GetPlantRelationByIdController.js';
import { getPlantRelationByIdRequest } from '../../../../../src/apps/agroApi/controllers/PlantRelations/requestSchemas.js';
import type { PlantRelationReadView } from '../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import type { GetPlantRelationById } from '../../../../../src/Contexts/Agro/PlantRelations/application/useCases/GetPlantRelationById.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('GetPlantRelationByIdController', () => {
  const fakeLogger: AppLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  const sampleView: PlantRelationReadView = {
    id: '0192e201-0000-7000-8000-000000000001',
    source: {
      scope: 'plant',
      value: '0192e200-0000-7000-8000-000000000001'
    },
    target: {
      scope: 'plant',
      value: '0192e200-0000-7000-8000-000000000002'
    },
    sourcePlantId: '0192e200-0000-7000-8000-000000000001',
    targetPlantId: '0192e200-0000-7000-8000-000000000002',
    type: 'beneficial',
    mechanism: 'pest_repellent',
    strength: 4,
    proximity: { minDistanceCm: 0, maxDistanceCm: 50 },
    reason: 'Repels pests',
    metadata: {
      createdAt: new Date('2026-10-28T12:00:00.000Z'),
      createdBy: 'system',
      updatedAt: new Date('2026-10-28T12:00:00.000Z'),
      updatedBy: 'system'
    },
    version: 0
  };

  it('answers 200 OK and emits strong ETag header', async () => {
    const getPlantRelationById = {
      execute: jest.fn().mockResolvedValue(sampleView)
    } as unknown as GetPlantRelationById;
    const controller = new GetPlantRelationByIdController({
      getPlantRelationById,
      logger: fakeLogger
    });
    const req = buildRequest({ params: { id: sampleView.id } });
    const { res, status, json, set } = buildResponse();
    const next = buildNext();

    await runWithValidation(getPlantRelationByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(200);
    expect(set).toHaveBeenCalledWith('ETag', '"0"');
    expect(json).toHaveBeenCalledWith({
      id: sampleView.id,
      source: sampleView.source,
      target: sampleView.target,
      sourcePlantId: sampleView.sourcePlantId,
      targetPlantId: sampleView.targetPlantId,
      type: sampleView.type,
      mechanism: sampleView.mechanism,
      strength: sampleView.strength,
      proximity: sampleView.proximity,
      reason: sampleView.reason,
      metadata: sampleView.metadata,
      version: 0
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards include options and serializes embedded companion plants', async () => {
    const viewWithIncludedPlants: PlantRelationReadView = {
      ...sampleView,
      sourcePlant: {
        id: '0192e200-0000-7000-8000-000000000001',
        name: { primary: 'tomate', aliases: ['tomatera'] },
        scientificName: 'solanum lycopersicum',
        image: { url: 'https://example.com/tomato.jpg' },
        slug: 'tomate-slug'
      },
      targetPlant: {
        id: '0192e200-0000-7000-8000-000000000002',
        name: { primary: 'albahaca' },
        scientificName: 'ocimum basilicum',
        image: null,
        slug: 'albahaca-slug'
      }
    };
    const executeMock = jest.fn().mockResolvedValue(viewWithIncludedPlants);
    const getPlantRelationById = {
      execute: executeMock
    } as unknown as GetPlantRelationById;
    const controller = new GetPlantRelationByIdController({
      getPlantRelationById,
      logger: fakeLogger
    });
    const req = buildRequest({
      params: { id: sampleView.id },
      query: { include: 'sourcePlant,targetPlant' }
    });
    const { res, status, json, set } = buildResponse();
    const next = buildNext();

    await runWithValidation(getPlantRelationByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(executeMock).toHaveBeenCalledWith(sampleView.id, {
      include: ['sourcePlant', 'targetPlant']
    });
    expect(set).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      id: sampleView.id,
      source: sampleView.source,
      target: sampleView.target,
      sourcePlantId: sampleView.sourcePlantId,
      targetPlantId: sampleView.targetPlantId,
      type: sampleView.type,
      mechanism: sampleView.mechanism,
      strength: sampleView.strength,
      proximity: sampleView.proximity,
      reason: sampleView.reason,
      metadata: sampleView.metadata,
      version: 0,
      sourcePlant: viewWithIncludedPlants.sourcePlant,
      targetPlant: viewWithIncludedPlants.targetPlant
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when use case fails', async () => {
    const error = new Error('Relation not found');
    const getPlantRelationById = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as GetPlantRelationById;
    const controller = new GetPlantRelationByIdController({
      getPlantRelationById,
      logger: fakeLogger
    });
    const req = buildRequest({ params: { id: sampleView.id } });
    const { res } = buildResponse();
    const next = buildNext();

    await runWithValidation(getPlantRelationByIdRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const getPlantRelationById = {
      execute: jest.fn()
    } as unknown as GetPlantRelationById;
    const controller = new GetPlantRelationByIdController({
      getPlantRelationById,
      logger: fakeLogger
    });
    const req = buildRequest({ params: { id: sampleView.id } });
    const { res } = buildResponse();
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
