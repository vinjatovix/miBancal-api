import type { Server } from 'node:http';
import request, { type Response } from 'supertest';
import type { PlantPrimitives } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantPrimitives.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';
import { buildPatch } from '../../../../../shared/dto/buildPatch.js';
import { deepMerge } from '../../../../../shared/dto/deepMerge.js';

const basePlant = () => ({
  id: random.uuid(),
  identity: {
    name: { primary: 'Test plant' },
    // Unique: plant scientific names are unique ignoring case.
    scientificName: `Plantus ${random.word({ min: 8, max: 16 })}`,
    family: 'fam_test'
  },
  traits: {
    lifecycle: 'annual',
    size: {
      height: { min: 10, max: 20 },
      spread: { min: 10, max: 20 }
    },
    spacingCm: { min: 10, max: 20 }
  },
  phenology: {
    sowing: {
      months: [1],
      seedsPerHole: { min: 1, max: 2 },
      germinationDays: { min: 1, max: 3 },
      methods: {
        direct: { depthCm: { min: 1, max: 2 } }
      }
    },
    flowering: { months: [1] },
    harvest: { months: [1] }
  },
  knowledge: {
    rootSystem: {
      type: 'fibrous',
      depthCm: { min: 10, max: 30 },
      spreadCm: { min: 10, max: 20 }
    },
    soil: {
      ph: { min: 6, max: 7 },
      availableDepthCm: { min: 20, max: 40 }
    },
    light: { hoursMin: 6, type: 'full_sun' },
    propagation: { methods: {} },
    // Every plant has an image resource.
    resources: [{ type: 'image', url: 'https://example.org/plant.jpg' }]
  }
});

export const PlantSeeder = (httpServer: Server, token: string) => {
  const post = async (body: object): Promise<PlantPrimitives> => {
    const res: Response = await request(httpServer)
      .post('/api/v1/plants')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    return res.body as PlantPrimitives;
  };

  return {
    async create(overrides = {}) {
      const body = deepMerge(basePlant(), buildPatch(overrides)) as object;

      return post(body);
    },
    // A vegetatively propagated / sterile crop: the create body omits the whole
    // `phenology.sowing` block, so the stored document has no such key.
    async createWithoutSowing(overrides = {}) {
      const base = basePlant();
      const { sowing: _sowing, ...phenology } = base.phenology;
      const body = deepMerge(
        { ...base, phenology },
        buildPatch(overrides)
      ) as object;

      return post(body);
    },
    async createMany(count: number, overrides = {}) {
      const plants: PlantPrimitives[] = [];
      for (let i = 0; i < count; i++) {
        const plant = await this.create(overrides); // NOSONAR: inserted one by one; unsorted listings return insertion order, which scenarios assert
        plants.push(plant);
      }
      return plants;
    }
  };
};
