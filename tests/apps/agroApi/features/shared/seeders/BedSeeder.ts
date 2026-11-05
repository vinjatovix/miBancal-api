import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import type { BedPrimitives } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';

export const BedSeeder = (server: Server, token: string) => ({
  async createOne(
    overrides?: Partial<{
      id: string;
      locationId: string;
      name: string;
      width: number;
      height: number;
      depth: number;
    }>
  ) {
    let locationId = overrides?.locationId;
    if (!locationId) {
      const locationResponse: Response = await request(server)
        .post('/api/v1/locations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: random.uuid(),
          name: `Location ${random.uuid().slice(0, 8)}`,
          latitude: 40.4168,
          longitude: -3.7038
        })
        .expect(201);
      locationId = (locationResponse.body as { id: string }).id;
    }

    const defaults = {
      id: random.uuid(),
      locationId,
      name: 'Test bed',
      width: 100,
      height: 100,
      depth: 30
    };
    const payload = { ...defaults, ...overrides };

    const response: Response = await request(server)
      .post('/api/v1/beds')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    return response.body as BedPrimitives;
  }
});
