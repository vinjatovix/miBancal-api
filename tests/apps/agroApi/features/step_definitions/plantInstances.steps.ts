import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import {
  currentResponse,
  rawCollection,
  suite,
  type AgroWorld
} from './utils/index.js';

const seedCropInCurrentBed = async (
  world: AgroWorld,
  fields: Record<string, unknown>
): Promise<void> => {
  if (!world.bedId) {
    assert.fail('bedId not set');
  }

  const bed = await rawCollection('beds').findOne({
    _id: toMongoId(world.bedId)
  });
  if (!bed) {
    assert.fail(`Bed ${world.bedId} not found`);
  }

  const cropId = random.uuid();
  const plantId = world.plantId ?? random.uuid();

  await rawCollection('plant_instances').insertOne({
    _id: toMongoId(cropId),
    userId: bed.userId,
    bedId: toMongoId(world.bedId),
    plantId: toMongoId(plantId),
    position: { x: 30, y: 30 },
    growthStatus: 'planted',
    instanceStatus: 'active',
    plantedAt: new Date().toISOString(),
    metadata: {
      createdAt: new Date(),
      createdBy: 'test-user',
      updatedAt: new Date(),
      updatedBy: 'test-user'
    },
    version: 0,
    ...fields
  });

  world.cropId = cropId;
};

/**
 * Seeds an active plant whose minimum planting spacing is `minSpacingCm`, so a
 * scenario can give crops distinct vital radii (`spacingCm.min / 2`). The
 * optimal frame (`spacingCm.max`) no longer drives collision, so it is set
 * equal to the minimum. Returns the new plant id without touching `plantId`.
 */
const seedPlantWithMinSpacing = async (
  world: AgroWorld,
  minSpacingCm: number
): Promise<string> => {
  const plant = await suite().seeders.plant.create({
    'identity.family': world.familyId,
    'traits.spacingCm.min': minSpacingCm,
    'traits.spacingCm.max': minSpacingCm
  });

  return plant.id;
};

Given('a crop exists in the bed', async function (this: AgroWorld) {
  await seedCropInCurrentBed(this, {});
});

Given(
  'a plant with min spacing {int} exists',
  async function (this: AgroWorld, minSpacingCm: number) {
    this.plantId = await seedPlantWithMinSpacing(this, minSpacingCm);
  }
);

Given(
  'a crop of a plant with min spacing {int} exists in the bed at {int}, {int}',
  async function (this: AgroWorld, minSpacingCm: number, x: number, y: number) {
    const neighborPlantId = await seedPlantWithMinSpacing(this, minSpacingCm);
    await seedCropInCurrentBed(this, {
      plantId: toMongoId(neighborPlantId),
      position: { x, y }
    });
  }
);

Given(
  'a crop with variety and notes exists in the bed',
  async function (this: AgroWorld) {
    await seedCropInCurrentBed(this, {
      variety: 'Roma',
      notes: 'Near the edge'
    });
  }
);

Given(
  'a crop exists in the bed at {int}, {int}',
  async function (this: AgroWorld, x: number, y: number) {
    await seedCropInCurrentBed(this, { position: { x, y } });
  }
);

Then(
  'the bed stored version should be {int}',
  async function (this: AgroWorld, expectedVersion: number) {
    if (!this.bedId) {
      assert.fail('bedId not set');
    }

    const bed = await rawCollection('beds').findOne({
      _id: toMongoId(this.bedId)
    });
    assert.exists(bed, `Bed ${this.bedId} not found in database`);
    const actualVersion = (bed as { version?: number } | null)?.version;
    assert.strictEqual(
      actualVersion,
      expectedVersion,
      `Expected bed version to be ${expectedVersion} but got ${String(actualVersion)}`
    );
  }
);

Then('the response crop should be active', async function (this: AgroWorld) {
  const response = await currentResponse(this);
  const body = response.body as { instanceStatus?: string };
  assert.strictEqual(body.instanceStatus, 'active');
});

Then('the crop should be removed', async function (this: AgroWorld) {
  if (!this.cropId) {
    assert.fail('cropId not set');
  }

  const crop = await rawCollection('plant_instances').findOne({
    _id: toMongoId(this.cropId)
  });
  assert.exists(crop, `Crop ${this.cropId} not found`);
  const cropDoc = crop as {
    instanceStatus?: string;
    removedAt?: unknown;
  } | null;
  assert.strictEqual(cropDoc?.instanceStatus, 'removed');
  assert.exists(cropDoc?.removedAt);
});

Then(
  'the stored crop should not have the fields {string}',
  async function (this: AgroWorld, fields: string) {
    if (!this.cropId) {
      assert.fail('cropId not set');
    }

    const crop = await rawCollection('plant_instances').findOne({
      _id: toMongoId(this.cropId)
    });
    assert.exists(crop, `Crop ${this.cropId} not found`);
    for (const field of fields.split(',')) {
      assert.notProperty(crop, field.trim());
    }
  }
);

Then(
  'the crop should not belong to the current bed',
  async function (this: AgroWorld) {
    if (!this.cropId || !this.bedId) {
      assert.fail('cropId or bedId not set');
    }

    const crop = await rawCollection('plant_instances').findOne({
      _id: toMongoId(this.cropId)
    });
    assert.exists(crop, `Crop ${this.cropId} not found`);
    assert.notDeepEqual(crop?.bedId, toMongoId(this.bedId));
  }
);

Then('the bed should have no active crops', async function (this: AgroWorld) {
  if (!this.bedId) {
    assert.fail('bedId not set');
  }

  const activeCount = await rawCollection('plant_instances').countDocuments({
    bedId: toMongoId(this.bedId),
    instanceStatus: 'active'
  });
  assert.strictEqual(activeCount, 0);
});

Given(
  'a crop with id {string} exists in the bed at {int}, {int}',
  async function (this: AgroWorld, id: string, x: number, y: number) {
    await seedCropInCurrentBed(this, {
      _id: toMongoId(id),
      position: { x, y }
    });
  }
);

Given(
  'a crop with id {string} and version {int} exists in the bed at {int}, {int}',
  async function (
    this: AgroWorld,
    id: string,
    version: number,
    x: number,
    y: number
  ) {
    await seedCropInCurrentBed(this, {
      _id: toMongoId(id),
      version,
      position: { x, y }
    });
  }
);

Given(
  'a removed crop with id {string} exists in the bed',
  async function (this: AgroWorld, id: string) {
    await seedCropInCurrentBed(this, {
      _id: toMongoId(id),
      instanceStatus: 'removed',
      removedAt: new Date().toISOString()
    });
  }
);

Then(
  /^the crop with id "([^"]+)" should be stored at (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)$/,
  async function (id: string, xStr: string, yStr: string) {
    const x = Number(xStr);
    const y = Number(yStr);
    const crop = await rawCollection('plant_instances').findOne({
      _id: toMongoId(id)
    });
    assert.exists(crop, `Crop ${id} not found`);
    const pos = (crop as { position?: { x: number; y: number } } | null)
      ?.position;
    assert.strictEqual(pos?.x, x);
    assert.strictEqual(pos?.y, y);
  }
);

Then(
  'the crop should be stored at {int}, {int}',
  async function (this: AgroWorld, x: number, y: number) {
    if (!this.cropId) {
      assert.fail('cropId not set');
    }
    const crop = await rawCollection('plant_instances').findOne({
      _id: toMongoId(this.cropId)
    });
    assert.exists(crop, `Crop ${this.cropId} not found`);
    const pos = (crop as { position?: { x: number; y: number } } | null)
      ?.position;
    assert.strictEqual(pos?.x, x);
    assert.strictEqual(pos?.y, y);
  }
);

Then(
  'the crop with id {string} should be removed',
  async function (id: string) {
    const crop = await rawCollection('plant_instances').findOne({
      _id: toMongoId(id)
    });
    assert.exists(crop, `Crop ${id} not found`);
    const status = (crop as { instanceStatus?: string } | null)?.instanceStatus;
    assert.strictEqual(status, 'removed');
  }
);

Then('no crop should be stored with id {string}', async function (id: string) {
  const crop = await rawCollection('plant_instances').findOne({
    _id: toMongoId(id)
  });
  assert.isNull(crop, `Crop ${id} should not exist`);
});

Then(
  'the response array should contain {int} items',
  async function (this: AgroWorld, count: number) {
    const response = await currentResponse(this);
    const body: unknown = response.body;
    assert.isArray(body);
    assert.strictEqual((body as unknown[]).length, count);
  }
);

Then(
  'the response array should contain crop with id {string} at {int}, {int}',
  async function (this: AgroWorld, id: string, x: number, y: number) {
    const response = await currentResponse(this);
    const body = response.body as Array<{
      id: string;
      position?: { x: number; y: number };
    }>;
    assert.isArray(body);
    const crop = body.find((c) => c.id === id);
    assert.exists(crop, `Crop ${id} not found in response array`);
    assert.strictEqual(crop?.position?.x, x);
    assert.strictEqual(crop?.position?.y, y);
  }
);
