import {
  batchPlacePlantInstancesRequest,
  batchRemovePlantInstancesRequest,
  batchUpdatePlantInstancesRequest
} from '../../../../../src/apps/agroApi/controllers/PlantInstances/requestSchemas.js';
import type { RequestSchemas } from '../../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';
import {
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

const errorsOf = async (
  schemas: RequestSchemas,
  body: Record<string, unknown>
): Promise<Record<string, string>> => {
  const req = buildRequest({ body });
  const { res } = buildResponse();
  const error = await runWithValidation(schemas, req, res);

  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(400);

  return (error as HttpError).errors ?? {};
};

describe('batchRequestSchemas', () => {
  const validBedId = '11111111-1111-4111-8111-111111111111';
  const validPlantId = '22222222-2222-4222-8222-222222222222';
  const validCropId1 = '33333333-3333-4333-8333-333333333333';
  const validCropId2 = '44444444-4444-4444-8444-444444444444';

  describe('batchPlacePlantInstancesRequest', () => {
    it('accepts valid batch place payload', async () => {
      const req = buildRequest({
        body: {
          bedId: validBedId,
          items: [
            {
              id: validCropId1,
              plantId: validPlantId,
              position: { x: 10, y: 20 },
              growthStatus: 'seeded',
              variety: 'Cherry',
              notes: 'First row'
            },
            {
              id: validCropId2,
              plantId: validPlantId
            }
          ]
        }
      });
      const { res } = buildResponse();

      const error = await runWithValidation(
        batchPlacePlantInstancesRequest,
        req,
        res
      );

      expect(error).toBeUndefined();
    });

    it('rejects empty items array', async () => {
      const errors = await errorsOf(batchPlacePlantInstancesRequest, {
        bedId: validBedId,
        items: []
      });

      expect(errors).toHaveProperty('items');
    });

    it('rejects items array with more than 100 elements', async () => {
      const items = Array.from({ length: 101 }, (_, i) => ({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        plantId: validPlantId
      }));
      const errors = await errorsOf(batchPlacePlantInstancesRequest, {
        bedId: validBedId,
        items
      });

      expect(errors).toHaveProperty('items');
    });

    it('rejects duplicate IDs within batch items', async () => {
      const errors = await errorsOf(batchPlacePlantInstancesRequest, {
        bedId: validBedId,
        items: [
          { id: validCropId1, plantId: validPlantId },
          { id: validCropId1, plantId: validPlantId }
        ]
      });

      expect(errors).toHaveProperty('items');
      expect(errors.items).toBe('Duplicate item IDs within batch');
    });

    it.each([
      [-1, 10, 'items.0.position.x'],
      [10, -1, 'items.0.position.y']
    ])('rejects negative coordinates (%i, %i)', async (x, y, fieldPath) => {
      const errors = await errorsOf(batchPlacePlantInstancesRequest, {
        bedId: validBedId,
        items: [
          {
            id: validCropId1,
            plantId: validPlantId,
            position: { x, y }
          }
        ]
      });

      expect(errors).toHaveProperty([fieldPath]);
    });
  });

  describe('batchUpdatePlantInstancesRequest', () => {
    it('accepts valid batch update payload', async () => {
      const req = buildRequest({
        body: {
          items: [
            {
              id: validCropId1,
              version: 0,
              position: { x: 30, y: 40 },
              growthStatus: 'growing',
              variety: 'San Marzano',
              notes: 'Moved'
            },
            {
              id: validCropId2,
              version: 2
            }
          ]
        }
      });
      const { res } = buildResponse();

      const error = await runWithValidation(
        batchUpdatePlantInstancesRequest,
        req,
        res
      );

      expect(error).toBeUndefined();
    });

    it('rejects empty items array', async () => {
      const errors = await errorsOf(batchUpdatePlantInstancesRequest, {
        items: []
      });

      expect(errors).toHaveProperty('items');
    });

    it('rejects duplicate IDs within update batch', async () => {
      const errors = await errorsOf(batchUpdatePlantInstancesRequest, {
        items: [
          { id: validCropId1, version: 1 },
          { id: validCropId1, version: 1 }
        ]
      });

      expect(errors).toHaveProperty('items');
      expect(errors.items).toBe('Duplicate item IDs within batch');
    });

    it('rejects negative version number', async () => {
      const errors = await errorsOf(batchUpdatePlantInstancesRequest, {
        items: [{ id: validCropId1, version: -1 }]
      });

      expect(errors).toHaveProperty(['items.0.version']);
    });

    it.each([
      [-1, 10, 'items.0.position.x'],
      [10, -1, 'items.0.position.y']
    ])('rejects negative coordinates (%i, %i)', async (x, y, fieldPath) => {
      const errors = await errorsOf(batchUpdatePlantInstancesRequest, {
        items: [
          {
            id: validCropId1,
            version: 0,
            position: { x, y }
          }
        ]
      });

      expect(errors).toHaveProperty([fieldPath]);
    });
  });

  describe('batchRemovePlantInstancesRequest', () => {
    it('accepts valid batch remove payload', async () => {
      const req = buildRequest({
        body: {
          items: [
            { id: validCropId1, version: 0 },
            { id: validCropId2, version: 1 }
          ]
        }
      });
      const { res } = buildResponse();

      const error = await runWithValidation(
        batchRemovePlantInstancesRequest,
        req,
        res
      );

      expect(error).toBeUndefined();
    });

    it('rejects empty items array', async () => {
      const errors = await errorsOf(batchRemovePlantInstancesRequest, {
        items: []
      });

      expect(errors).toHaveProperty('items');
    });

    it('rejects duplicate IDs within remove batch', async () => {
      const errors = await errorsOf(batchRemovePlantInstancesRequest, {
        items: [
          { id: validCropId1, version: 0 },
          { id: validCropId1, version: 0 }
        ]
      });

      expect(errors).toHaveProperty('items');
      expect(errors.items).toBe('Duplicate item IDs within batch');
    });
  });
});
