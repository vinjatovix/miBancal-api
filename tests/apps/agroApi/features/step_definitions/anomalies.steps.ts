import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import type { CreateAnomalyDto } from '../../../../../src/Contexts/Agro/Anomalies/application/useCases/interfaces/CreateAnomalyDto.js';
import {
  assertDocumentUnchanged,
  currentResponse,
  rawCollection,
  recordDocument,
  softDeleteDocument,
  suite,
  type AgroWorld
} from './utils/index.js';

type SeededAnomaly = { id: string; slug: string };

const IMAGE_RESOURCE = {
  type: 'image' as const,
  url: 'https://example.org/oidio.jpg',
  title: 'Powdery mildew'
};

const seedAnomaly = async (
  overrides: Partial<CreateAnomalyDto>
): Promise<SeededAnomaly> => {
  const anomaly = await suite().seeders.anomaly.create(overrides);
  assert.exists(anomaly.id, 'AnomalySeeder created no anomaly');

  return { id: anomaly.id, slug: anomaly.slug };
};

Given(
  'a seeded anomaly {string} exists',
  async function (this: AgroWorld, slug: string) {
    const seeded = await seedAnomaly({ slug });
    this.anomalyId = seeded.id;
    this.anomalySlug = seeded.slug;
  }
);

Given(
  'a seeded look-alike anomaly {string} exists',
  async function (this: AgroWorld, slug: string) {
    const seeded = await seedAnomaly({ slug });
    this.otherAnomalyId = seeded.id;
    this.otherAnomalySlug = seeded.slug;
  }
);

Given(
  'a seeded anomaly {string} with a support image resource and confusedWith {string}',
  async function (this: AgroWorld, slug: string, confused: string) {
    const seeded = await seedAnomaly({
      slug,
      resources: [IMAGE_RESOURCE],
      confusedWith: [confused]
    });
    this.anomalyId = seeded.id;
    this.anomalySlug = seeded.slug;
  }
);

Given(
  'a seeded anomaly {string} with confusedWith {string}',
  async function (this: AgroWorld, slug: string, confused: string) {
    const seeded = await seedAnomaly({ slug, confusedWith: [confused] });
    this.anomalyId = seeded.id;
    this.anomalySlug = seeded.slug;
  }
);

Given(
  'the look-alike anomaly is soft-deleted',
  async function (this: AgroWorld) {
    assert.exists(this.otherAnomalyId, 'No look-alike anomaly was seeded');

    await softDeleteDocument('anomalies', this.otherAnomalyId, {
      status: 'DELETED',
      deletedAt: new Date().toISOString()
    });
  }
);

Given('I record the current anomaly', async function (this: AgroWorld) {
  await recordDocument(this, 'anomalies', this.anomalyId);
});

Then('the anomaly should be unchanged', async function (this: AgroWorld) {
  await assertDocumentUnchanged(this, 'anomalies', this.anomalyId);
});

Then(
  'the response confusedWith should contain {string}',
  async function (this: AgroWorld, slug: string) {
    const body = (await currentResponse(this)).body as {
      confusedWith?: unknown;
    };

    assert.isArray(body.confusedWith, 'Response has no confusedWith array');
    assert.include(body.confusedWith as string[], slug);
  }
);

Then(
  'the stored anomaly {string} has no {string} field',
  async function (this: AgroWorld, slug: string, field: string) {
    const stored = await rawCollection('anomalies').findOne({ slug });

    assert.exists(stored, `Anomaly ${slug} not found`);
    assert.notProperty(stored, field);
  }
);
