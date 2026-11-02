import { updateBedRequest } from '../../../../../src/apps/agroApi/controllers/Beds/requestSchemas.js';
import { HttpError } from '../../../../../src/shared/errors/index.js';
import {
  buildRequest,
  buildResponse,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('updateBedRequest', () => {
  const validId = '11111111-1111-4111-8111-111111111111';

  it('accepts valid bed patch fields', async () => {
    const req = buildRequest({
      params: { id: validId },
      body: { name: 'Renamed Bed', width: 120 }
    });
    const { res } = buildResponse();

    const error = await runWithValidation(updateBedRequest, req, res);

    expect(error).toBeUndefined();
  });

  it.each([
    ['postalCode', '28001'],
    ['country', 'Spain'],
    ['timezone', 'Europe/Madrid'],
    ['hemisphere', 'north']
  ])('rejects unexpected geographic field: %s', async (field, value) => {
    const req = buildRequest({
      params: { id: validId },
      body: { [field]: value }
    });
    const { res } = buildResponse();

    const error = await runWithValidation(updateBedRequest, req, res);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(400);
  });
});
