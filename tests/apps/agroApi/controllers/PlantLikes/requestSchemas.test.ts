import httpStatus from 'http-status';
import {
  checkPlantLikeRequest,
  likePlantRequest,
  unlikePlantRequest
} from '../../../../../src/apps/agroApi/controllers/PlantLikes/requestSchemas.js';
import type { RequestSchemas } from '../../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';
import {
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

type RequestParts = Parameters<typeof buildRequest>[0];

const validate = (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<unknown> =>
  runWithValidation(schemas, buildRequest(parts), buildResponse().res);

const errorsOf = async (
  schemas: RequestSchemas,
  parts: RequestParts
): Promise<Record<string, string>> => {
  const error = await validate(schemas, parts);

  expect(error).toBeInstanceOf(HttpError);
  expect((error as HttpError).statusCode).toBe(httpStatus.BAD_REQUEST);

  return (error as HttpError).errors ?? {};
};

describe('PlantLikes Request Schemas', () => {
  const validPlantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  const schemas = [
    ['likePlantRequest', likePlantRequest],
    ['unlikePlantRequest', unlikePlantRequest],
    ['checkPlantLikeRequest', checkPlantLikeRequest]
  ] as const;

  describe.each(schemas)('%s', (_name, schema) => {
    it('accepts valid uuid plantId param and empty body and query', async () => {
      const error = await validate(schema, {
        params: { plantId: validPlantId }
      });

      expect(error).toBeUndefined();
    });

    it.each([
      { label: 'non-uuid plantId', params: { plantId: 'not-a-uuid' } },
      { label: 'empty string plantId', params: { plantId: '' } }
    ])('rejects invalid path param ($label)', async ({ params }) => {
      const errors = await errorsOf(schema, { params });

      expect(errors['plantId']).toBeDefined();
    });

    it('rejects unexpected request body', async () => {
      const errors = await errorsOf(schema, {
        params: { plantId: validPlantId },
        body: { forbidden: 'payload' }
      });

      expect(errors['forbidden']).toBeDefined();
    });

    it('rejects unexpected query parameters', async () => {
      const errors = await errorsOf(schema, {
        params: { plantId: validPlantId },
        query: { extra: 'param' }
      });

      expect(errors['extra']).toBeDefined();
    });
  });
});
