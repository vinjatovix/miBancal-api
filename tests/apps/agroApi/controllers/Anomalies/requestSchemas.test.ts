import httpStatus from 'http-status';

import { createAnomalyRequest } from '../../../../../src/apps/agroApi/controllers/Anomalies/requestSchemas.js';
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
  });
});
