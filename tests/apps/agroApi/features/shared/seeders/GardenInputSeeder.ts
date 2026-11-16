import type { Server } from 'node:http';
import request from 'supertest';
import type { GardenInputPrimitives } from '../../../../../../src/Contexts/Agro/GardenInputs/domain/entities/types/GardenInputPrimitives.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';

export const GardenInputSeeder = (httpServer: Server, token: string) => {
  return {
    async create(
      overrides: Partial<GardenInputPrimitives> = {}
    ): Promise<GardenInputPrimitives> {
      const slug = overrides.slug || random.word({ min: 8, max: 30 });
      const body = {
        id: random.uuid(),
        slug,
        name: `${slug} input`,
        category: 'defense',
        actions: ['insecticide'],
        ...overrides
      };

      const response = await request(httpServer)
        .post('/api/v1/garden-inputs')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      if (response.status !== 201) {
        throw new Error(`GardenInputSeeder failed: ${response.text}`);
      }

      return response.body as GardenInputPrimitives;
    }
  };
};
