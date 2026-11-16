import httpStatus from 'http-status';

import {
  createAnomalyRequest,
  updateAnomalyRequest
} from '../../../../../src/apps/agroApi/controllers/Anomalies/requestSchemas.js';
import type { RequestSchemas } from '../../../../../src/apps/agroApi/middlewares/validateRequest.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';
import { AnomalyScenarios } from '../../../../Contexts/Agro/Anomalies/domain/mothers/AnomalyScenarios.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
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

describe('Anomaly requestSchemas', () => {
  describe('createAnomalyRequest', () => {
    it('should accept a valid kebab-case slug', async () => {
      const body = AnomalyScenarios.createDtoBase();

      const error = await validate(createAnomalyRequest, { body });

      expect(error).toBeUndefined();
    });

    it('should reject a slug that has the shape of a UUID', async () => {
      const body = AnomalyScenarios.createDtoBase({ slug: random.uuid() });

      const errors = await errorsOf(createAnomalyRequest, { body });

      expect(errors).toHaveProperty('slug');
    });

    it('should reject a category outside the allowed set', async () => {
      const body = AnomalyScenarios.createDtoBase({
        category: 'weed' as never
      });

      const errors = await errorsOf(createAnomalyRequest, { body });

      expect(errors).toHaveProperty('category');
    });

    it.each(['pest', 'disease', 'disorder'] as const)(
      'should accept a valid category (%s)',
      async (category) => {
        const body = AnomalyScenarios.createDtoBase({ category });

        const error = await validate(createAnomalyRequest, { body });

        expect(error).toBeUndefined();
      }
    );

    it('should accept optional resources and confusedWith', async () => {
      const body = AnomalyScenarios.createDtoBase({
        resources: [
          {
            type: 'image',
            url: 'https://example.org/oidio.jpg',
            title: 'Oidio'
          }
        ],
        confusedWith: ['mildiu']
      });

      const error = await validate(createAnomalyRequest, { body });

      expect(error).toBeUndefined();
    });

    it('should reject a resource with an unrecognised type', async () => {
      const body = AnomalyScenarios.createDtoBase({
        resources: [
          { type: 'audio', url: 'https://example.org/a.mp3' }
        ] as never
      });

      const errors = await errorsOf(createAnomalyRequest, { body });

      expect(errors).toHaveProperty(['resources.0.type']);
    });

    it('should reject a resource without a url', async () => {
      const body = AnomalyScenarios.createDtoBase({
        resources: [{ type: 'image' }] as never
      });

      const errors = await errorsOf(createAnomalyRequest, { body });

      expect(errors).toHaveProperty(['resources.0.url']);
    });

    it('should reject a resource with an oversized title', async () => {
      const body = AnomalyScenarios.createDtoBase({
        resources: [
          {
            type: 'image',
            url: 'https://example.org/a.jpg',
            title: 'x'.repeat(201)
          }
        ]
      });

      const errors = await errorsOf(createAnomalyRequest, { body });

      expect(errors).toHaveProperty(['resources.0.title']);
    });

    it('should reject a confusedWith slug that is not kebab-case', async () => {
      const body = AnomalyScenarios.createDtoBase({
        confusedWith: ['Not Kebab']
      });

      const errors = await errorsOf(createAnomalyRequest, { body });

      expect(errors).toHaveProperty(['confusedWith.0']);
    });
  });

  describe('updateAnomalyRequest', () => {
    const params = { idOrSlug: 'pulgon' };

    it('should accept null to clear resources and confusedWith', async () => {
      const error = await validate(updateAnomalyRequest, {
        params,
        body: { resources: null, confusedWith: null }
      });

      expect(error).toBeUndefined();
    });

    it('should reject a malformed resource on update', async () => {
      const errors = await errorsOf(updateAnomalyRequest, {
        params,
        body: { resources: [{ type: 'image' }] }
      });

      expect(errors).toHaveProperty(['resources.0.url']);
    });
  });
});
