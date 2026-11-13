import type { Server } from 'node:http';
import request from 'supertest';
import type { CreateAnomalyDto } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/interfaces/CreateAnomalyDto.js';
import type { AnomalyPrimitives } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyPrimitives.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';

export const AnomalySeeder = (httpServer: Server, token: string) => {
  return {
    async create(
      overrides: Partial<CreateAnomalyDto> = {}
    ): Promise<AnomalyPrimitives> {
      // Long enough to keep slugs unique, short enough for the length limit.
      const slug = overrides.slug || random.word({ min: 8, max: 30 });
      const body: CreateAnomalyDto = {
        id: random.uuid(),
        slug,
        name: `${slug} anomaly`,
        category: 'pest',
        ...overrides
      };

      const response = await request(httpServer)
        .post('/api/v1/anomalies')
        .set('Authorization', `Bearer ${token}`)
        .send(body);

      if (response.status !== 201) {
        throw new Error(`AnomalySeeder failed: ${response.text}`);
      }

      return response.body as AnomalyPrimitives;
    },
    async createMany(
      count: number,
      overrides: Partial<CreateAnomalyDto> = {}
    ): Promise<AnomalyPrimitives[]> {
      const anomalies: AnomalyPrimitives[] = [];

      for (let i = 0; i < count; i++) {
        const anomaly = await this.create(overrides); // NOSONAR: inserted one by one; unsorted listings return insertion order, which scenarios assert
        anomalies.push(anomaly);
      }

      return anomalies;
    }
  };
};
