import httpStatus from 'http-status';
import {
  addPlantBookmarkRequest,
  checkPlantBookmarkRequest,
  getUserBookmarksRequest,
  removePlantBookmarkRequest
} from '../../../../../src/apps/agroApi/controllers/Bookmarks/requestSchemas.js';
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

describe('Bookmarks Request Schemas', () => {
  const validPlantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  describe('addPlantBookmarkRequest', () => {
    it('accepts valid body with uuid plantId and empty query', async () => {
      const error = await validate(addPlantBookmarkRequest, {
        body: { plantId: validPlantId }
      });

      expect(error).toBeUndefined();
    });

    it.each([
      { label: 'missing plantId', body: {} },
      { label: 'empty string plantId', body: { plantId: '' } },
      { label: 'non-uuid plantId', body: { plantId: 'not-a-uuid' } },
      { label: 'numeric plantId', body: { plantId: 12345 } }
    ])('rejects invalid body ($label)', async ({ body }) => {
      const errors = await errorsOf(addPlantBookmarkRequest, { body });

      expect(errors['plantId']).toBeDefined();
    });

    it('rejects unexpected query parameters', async () => {
      const errors = await errorsOf(addPlantBookmarkRequest, {
        body: { plantId: validPlantId },
        query: { extra: 'param' }
      });

      expect(errors['extra']).toBeDefined();
    });
  });

  describe('removePlantBookmarkRequest', () => {
    it('accepts valid uuid plantId param and empty body and query', async () => {
      const error = await validate(removePlantBookmarkRequest, {
        params: { plantId: validPlantId }
      });

      expect(error).toBeUndefined();
    });

    it.each([
      { label: 'non-uuid plantId', params: { plantId: 'not-a-uuid' } },
      { label: 'empty string plantId', params: { plantId: '' } }
    ])('rejects invalid path param ($label)', async ({ params }) => {
      const errors = await errorsOf(removePlantBookmarkRequest, { params });

      expect(errors['plantId']).toBeDefined();
    });

    it('rejects unexpected request body', async () => {
      const errors = await errorsOf(removePlantBookmarkRequest, {
        params: { plantId: validPlantId },
        body: { forbidden: 'payload' }
      });

      expect(errors['forbidden']).toBeDefined();
    });
  });

  describe('checkPlantBookmarkRequest', () => {
    it('accepts valid uuid plantId param and empty body and query', async () => {
      const error = await validate(checkPlantBookmarkRequest, {
        params: { plantId: validPlantId }
      });

      expect(error).toBeUndefined();
    });

    it.each([
      { label: 'non-uuid plantId', params: { plantId: 'invalid-uuid' } },
      { label: 'empty string plantId', params: { plantId: '' } }
    ])('rejects invalid path param ($label)', async ({ params }) => {
      const errors = await errorsOf(checkPlantBookmarkRequest, { params });

      expect(errors['plantId']).toBeDefined();
    });

    it('rejects unexpected request body', async () => {
      const errors = await errorsOf(checkPlantBookmarkRequest, {
        params: { plantId: validPlantId },
        body: { forbidden: 'payload' }
      });

      expect(errors['forbidden']).toBeDefined();
    });
  });

  describe('getUserBookmarksRequest', () => {
    it('accepts empty query and empty body', async () => {
      const error = await validate(getUserBookmarksRequest, {});

      expect(error).toBeUndefined();
    });

    it('accepts include=plant query parameter', async () => {
      const error = await validate(getUserBookmarksRequest, {
        query: { include: 'plant' }
      });

      expect(error).toBeUndefined();
    });

    it.each([
      { label: 'unsupported include value', query: { include: 'family' } },
      { label: 'empty include value', query: { include: '' } },
      { label: 'unknown query parameter', query: { extra: 'value' } }
    ])('rejects invalid query ($label)', async ({ query }) => {
      const errors = await errorsOf(getUserBookmarksRequest, { query });

      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('rejects unexpected request body', async () => {
      const errors = await errorsOf(getUserBookmarksRequest, {
        body: { forbidden: 'payload' }
      });

      expect(errors['forbidden']).toBeDefined();
    });
  });
});
