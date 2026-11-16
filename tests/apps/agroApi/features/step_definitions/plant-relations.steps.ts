import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Given, When } from '@cucumber/cucumber';
import { assert } from 'chai';
import { v4 as uuidv4 } from 'uuid';
import {
  fromMongoId,
  toMongoId
} from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  prepareRequest,
  rawCollection,
  suite,
  type AgroWorld,
  type Role
} from './utils/index.js';

type MockPlantRelation = {
  _id: string;
  sourcePlantId: string;
  targetPlantId: string;
  type: 'beneficial' | 'detrimental';
  mechanism: string;
  strength: number;
  minDistanceCm: number;
  maxDistanceCm: number | null;
  reason: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
  };
  version: number;
};

const mockRelations = JSON.parse(
  readFileSync(resolve(process.cwd(), 'mock_data/plantRelations.json'), 'utf-8')
) as MockPlantRelation[];

export const seedMockRelations = async (): Promise<void> => {
  const collection = rawCollection('plant_relations');
  const count = await collection.countDocuments();
  if (count === 0) {
    const docs = mockRelations.map((rel) => ({
      ...rel,
      _id: toMongoId(rel._id),
      source: {
        scope: 'plant',
        value: toMongoId(rel.sourcePlantId)
      },
      target: {
        scope: 'plant',
        value: toMongoId(rel.targetPlantId)
      },
      sourcePlantId: toMongoId(rel.sourcePlantId),
      targetPlantId: toMongoId(rel.targetPlantId),
      metadata: {
        ...rel.metadata,
        createdAt: new Date(rel.metadata.createdAt),
        updatedAt: new Date(rel.metadata.updatedAt)
      }
    }));
    await collection.insertMany(docs);
  }
};

Given('seeded plant relations exist', async function (this: AgroWorld) {
  await seedMockRelations();
  const first = await rawCollection('plant_relations').findOne();
  if (first) {
    this.plantRelationId = fromMongoId(first._id);
    this.sourcePlantId = fromMongoId(first.sourcePlantId);
    this.targetPlantId = fromMongoId(first.targetPlantId);
  }
});

Given(
  'a seeded plant relation exists with id {string}',
  async function (this: AgroWorld, id: string) {
    await seedMockRelations();
    const doc = await rawCollection('plant_relations').findOne({
      _id: toMongoId(id)
    });
    assert.exists(doc, `Plant relation with id "${id}" not found`);
    this.plantRelationId = id;
    if (doc) {
      this.sourcePlantId = fromMongoId(doc.sourcePlantId);
      this.targetPlantId = fromMongoId(doc.targetPlantId);
    }
  }
);

Given('two catalog plants exist', async function (this: AgroWorld) {
  const family = await suite().seeders.family.create();
  const plants = await suite().seeders.plant.createMany(2, {
    'identity.family': family.id
  });
  assert.lengthOf(plants, 2, 'Failed to seed two plants');
  const [firstPlant, secondPlant] = plants;
  if (!firstPlant?.id || !secondPlant?.id) {
    throw new Error('Failed to seed two plants with valid ids');
  }
  this.familyId = family.id;
  this.sourcePlantId = firstPlant.id;
  this.targetPlantId = secondPlant.id;
  this.plantId = firstPlant.id;
});

Given(
  'a plant relation exists between the two plants',
  async function (this: AgroWorld) {
    if (!this.sourcePlantId || !this.targetPlantId) {
      const family = await suite().seeders.family.create();
      const plants = await suite().seeders.plant.createMany(2, {
        'identity.family': family.id
      });
      const [firstPlant, secondPlant] = plants;
      if (!firstPlant?.id || !secondPlant?.id) {
        throw new Error('Failed to seed two plants with valid ids');
      }
      this.familyId = family.id;
      this.sourcePlantId = firstPlant.id;
      this.targetPlantId = secondPlant.id;
      this.plantId = firstPlant.id;
    }

    const relationId = uuidv4();
    const now = new Date();
    await rawCollection('plant_relations').insertOne({
      _id: toMongoId(relationId),
      source: {
        scope: 'plant',
        value: toMongoId(this.sourcePlantId)
      },
      target: {
        scope: 'plant',
        value: toMongoId(this.targetPlantId)
      },
      sourcePlantId: toMongoId(this.sourcePlantId),
      targetPlantId: toMongoId(this.targetPlantId),
      type: 'beneficial',
      mechanism: 'pest_repellent',
      strength: 4,
      minDistanceCm: 0,
      maxDistanceCm: 50,
      reason: 'Companion relationship for testing',
      metadata: {
        createdAt: now,
        createdBy: 'system',
        updatedAt: now,
        updatedBy: 'system'
      },
      version: 0
    });

    this.plantRelationId = relationId;
  }
);

Given(
  'a plant with companion relations across taxonomic tiers exists',
  async function (this: AgroWorld) {
    const family = await suite().seeders.family.create();
    const plant = await suite().seeders.plant.create({
      'identity.family': family.id,
      'identity.scientificName': 'solanum testii'
    });
    this.plantId = plant.id;
    this.familyId = family.id;

    const otherA = uuidv4();
    const otherB = uuidv4();
    const now = new Date();
    const base = {
      type: 'beneficial' as const,
      mechanism: 'pest_repellent',
      strength: 4,
      minDistanceCm: 0,
      maxDistanceCm: 50,
      reason: 'Tier relation for testing',
      metadata: {
        createdAt: now,
        createdBy: 'system',
        updatedAt: now,
        updatedBy: 'system'
      },
      version: 0
    };
    const plantScope = (id: string) => ({
      scope: 'plant' as const,
      value: toMongoId(id)
    });

    await rawCollection('plant_relations').insertMany([
      {
        ...base,
        _id: toMongoId(uuidv4()),
        mechanism: 'pest_repellent',
        source: plantScope(plant.id),
        target: plantScope(otherA),
        sourcePlantId: toMongoId(plant.id),
        targetPlantId: toMongoId(otherA)
      },
      {
        ...base,
        _id: toMongoId(uuidv4()),
        mechanism: 'nitrogen_fixer',
        source: { scope: 'genus', value: 'Solanum' },
        target: plantScope(otherA),
        targetPlantId: toMongoId(otherA)
      },
      {
        ...base,
        _id: toMongoId(uuidv4()),
        mechanism: 'disease_vector',
        type: 'detrimental',
        source: plantScope(otherA),
        target: { scope: 'family', value: toMongoId(family.id) },
        sourcePlantId: toMongoId(otherA)
      },
      {
        ...base,
        _id: toMongoId(uuidv4()),
        mechanism: 'growth_stimulator',
        source: { scope: 'genus', value: 'Trifolium' },
        target: { scope: 'all' }
      },
      {
        ...base,
        _id: toMongoId(uuidv4()),
        mechanism: 'allelopathy',
        source: { scope: 'genus', value: 'Allium' },
        target: plantScope(otherB),
        targetPlantId: toMongoId(otherB)
      }
    ]);
  }
);

Given(
  'a PATCH {role} request to the plant relation with If-Match {string} and body',
  function (this: AgroWorld, role: Role, ifMatch: string, body: string) {
    this.ifMatch = `"${ifMatch}"`;
    prepareRequest(this, {
      method: 'PATCH',
      route: `/api/v1/plant-relations/${this.plantRelationId}`,
      role,
      body,
      conditional: true
    });
  }
);

Given(
  'a PATCH {role} request to the plant relation with body',
  function (this: AgroWorld, role: Role, body: string) {
    delete this.ifMatch;
    prepareRequest(this, {
      method: 'PATCH',
      route: `/api/v1/plant-relations/${this.plantRelationId}`,
      role,
      body,
      conditional: false
    });
  }
);

When(
  'I send a PATCH request to the plant relation with If-Match {string} and body',
  function (this: AgroWorld, ifMatch: string, body: string) {
    this.ifMatch = `"${ifMatch}"`;
    prepareRequest(this, {
      method: 'PATCH',
      route: `/api/v1/plant-relations/${this.plantRelationId}`,
      body,
      conditional: true
    });
  }
);

Given(
  'a DELETE {role} request to the plant relation with If-Match {string}',
  function (this: AgroWorld, role: Role, ifMatch: string) {
    this.ifMatch = `"${ifMatch}"`;
    prepareRequest(this, {
      method: 'DELETE',
      route: `/api/v1/plant-relations/${this.plantRelationId}`,
      role,
      conditional: true
    });
  }
);

Given(
  'a DELETE {role} request to the plant relation without If-Match header',
  function (this: AgroWorld, role: Role) {
    delete this.ifMatch;
    prepareRequest(this, {
      method: 'DELETE',
      route: `/api/v1/plant-relations/${this.plantRelationId}`,
      role,
      conditional: false
    });
  }
);

When(
  'I send a DELETE request to the plant relation with If-Match {string}',
  function (this: AgroWorld, ifMatch: string) {
    this.ifMatch = `"${ifMatch}"`;
    prepareRequest(this, {
      method: 'DELETE',
      route: `/api/v1/plant-relations/${this.plantRelationId}`,
      conditional: true
    });
  }
);

When('I send a GET request to the plant relation', function (this: AgroWorld) {
  prepareRequest(this, {
    method: 'GET',
    route: `/api/v1/plant-relations/${this.plantRelationId}`
  });
});
