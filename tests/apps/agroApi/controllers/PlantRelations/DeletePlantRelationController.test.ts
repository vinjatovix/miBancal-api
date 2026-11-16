import type { NextFunction } from 'express';
import { DeletePlantRelationController } from '../../../../../src/apps/agroApi/controllers/PlantRelations/DeletePlantRelationController.js';
import { deletePlantRelationRequest } from '../../../../../src/apps/agroApi/controllers/PlantRelations/requestSchemas.js';
import { storeExpectedVersions } from '../../../../../src/apps/agroApi/shared/versionTags.js';
import type { DeletePlantRelation } from '../../../../../src/Contexts/Agro/PlantRelations/application/useCases/DeletePlantRelation.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('DeletePlantRelationController', () => {
  it('answers 204 No Content', async () => {
    const executeSpy = jest.fn().mockResolvedValue(undefined);
    const deletePlantRelation = {
      execute: executeSpy
    } as unknown as DeletePlantRelation;

    const controller = new DeletePlantRelationController({
      deletePlantRelation
    });

    const req = buildRequest({
      params: { id: '0192e200-0000-7000-8000-000000000001' }
    });
    const { res, status, end } = buildResponse();
    storeExpectedVersions(res, [1]);
    const next = buildNext();

    await runWithValidation(deletePlantRelationRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(status).toHaveBeenCalledWith(204);
    expect(end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(executeSpy).toHaveBeenCalledWith(
      '0192e200-0000-7000-8000-000000000001',
      [1]
    );
  });

  it('forwards error to next when use case fails', async () => {
    const error = new Error('Deletion failure');
    const deletePlantRelation = {
      execute: jest.fn().mockRejectedValue(error)
    } as unknown as DeletePlantRelation;

    const controller = new DeletePlantRelationController({
      deletePlantRelation
    });

    const req = buildRequest({
      params: { id: '0192e200-0000-7000-8000-000000000001' }
    });
    const { res } = buildResponse();
    storeExpectedVersions(res, [1]);
    const next = buildNext();

    await runWithValidation(deletePlantRelationRequest, req, res);
    await controller.run(req, res, next as NextFunction);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('forwards internal error to next when route has no validation step', async () => {
    const deletePlantRelation = {
      execute: jest.fn()
    } as unknown as DeletePlantRelation;

    const controller = new DeletePlantRelationController({
      deletePlantRelation
    });

    const req = buildRequest({
      params: { id: '0192e200-0000-7000-8000-000000000001' }
    });
    const { res } = buildResponse();
    storeExpectedVersions(res, [1]);
    const next = buildNext();

    await controller.run(req, res, next as NextFunction);

    expectInternalErrorPassedTo(next);
  });
});
