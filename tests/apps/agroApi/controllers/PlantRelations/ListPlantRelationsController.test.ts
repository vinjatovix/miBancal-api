import type { NextFunction } from 'express';
import { ListPlantRelationsController } from '../../../../../src/apps/agroApi/controllers/PlantRelations/ListPlantRelationsController.js';
import { listPlantRelationsRequest } from '../../../../../src/apps/agroApi/controllers/PlantRelations/requestSchemas.js';
import type { PlantRelationReadView } from '../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import type { ListPlantRelations } from '../../../../../src/Contexts/Agro/PlantRelations/application/useCases/ListPlantRelations.js';
import type { AppLogger } from '../../../../../src/Contexts/shared/plugins/logger.plugin.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('ListPlantRelationsController', () => {
  const fakeLogger: AppLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  const sampleView: PlantRelationReadView = {
    id: '0192e201-0000-7000-8000-000000000001',
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

  it('answers 200 OK with paginated plant relations', async () => {
    const paginatedResult = {
      data: [sampleView],
      pagination: {
        totalItems: 1,
        page: 1,
        limit: 25,
        totalPages: 1
      }
    };
    const listPlantRelations = {
      execute: jest.fn().mockResolvedValue(paginatedResult)
    } as unknown as ListPlantRelations;
    const controller = new ListPlantRelationsController({
      listPlantRelations,
      logger: fakeLogger
    });
    const req = buildRequest({ query: {} });
    const { res, status, json } = buildResponse();
    const next = buildNext();

    await runWithValidation(listPlantRelationsRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      data: [
        {
          id: sampleView.id,
          sourcePlantId: sampleView.sourcePlantId,
          targetPlantId: sampleView.targetPlantId,
          type: sampleView.type,
          mechanism: sampleView.mechanism,
          strength: sampleView.strength,
          proximity: sampleView.proximity,
          reason: sampleView.reason,
          metadata: sampleView.metadata,
          version: sampleView.version
        }
      ],
      pagination: paginatedResult.pagination
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 200 OK with embedded companion plants when include is requested', async () => {
    const viewWithIncludedPlants: PlantRelationReadView = {
      ...sampleView,
      sourcePlant: {
        id: sampleView.sourcePlantId,
        name: { primary: 'tomate', aliases: ['tomatera'] },
        scientificName: 'solanum lycopersicum',
        image: { url: 'https://example.com/tomato.jpg' }
      },
      targetPlant: {
        id: sampleView.targetPlantId,
        name: { primary: 'albahaca' },
        scientificName: 'ocimum basilicum',
        image: null
      }
    };
    const paginatedResult = {
      data: [viewWithIncludedPlants],
      pagination: {
        totalItems: 1,
        page: 1,
        limit: 25,
        totalPages: 1
      }
    };
    const executeMock = jest.fn().mockResolvedValue(paginatedResult);
    const listPlantRelations = {
      execute: executeMock
    } as unknown as ListPlantRelations;
    const controller = new ListPlantRelationsController({
      listPlantRelations,
      logger: fakeLogger
    });
    const req = buildRequest({ query: { include: 'sourcePlant,targetPlant' } });
    const { res, status, json } = buildResponse();
    const next = buildNext();

    await runWithValidation(listPlantRelationsRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(executeMock).toHaveBeenCalledWith({
      query: {
        include: ['sourcePlant', 'targetPlant'],
        pagination: { page: 1, limit: 25 }
      }
    });
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      data: [
        {
          id: sampleView.id,
          sourcePlantId: sampleView.sourcePlantId,
          targetPlantId: sampleView.targetPlantId,
          type: sampleView.type,
          mechanism: sampleView.mechanism,
          strength: sampleView.strength,
          proximity: sampleView.proximity,
          reason: sampleView.reason,
          metadata: sampleView.metadata,
          version: sampleView.version,
          sourcePlant: viewWithIncludedPlants.sourcePlant,
          targetPlant: viewWithIncludedPlants.targetPlant
        }
      ],
      pagination: paginatedResult.pagination
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards error to next when use case fails', async () => {
    const error = new Error('Database error');
    const listPlantRelations = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as ListPlantRelations;
    const controller = new ListPlantRelationsController({
      listPlantRelations,
      logger: fakeLogger
    });
    const req = buildRequest({ query: {} });
    const { res } = buildResponse();
    const next = buildNext();

    await runWithValidation(listPlantRelationsRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const listPlantRelations = {
      execute: jest.fn()
    } as unknown as ListPlantRelations;
    const controller = new ListPlantRelationsController({
      listPlantRelations,
      logger: fakeLogger
    });
    const req = buildRequest({ query: {} });
    const { res } = buildResponse();
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
