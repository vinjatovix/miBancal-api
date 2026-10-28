import { PlantRelation } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/PlantRelation.js';
import type {
  CreatePlantRelationParams,
  PlantRelationParameters
} from '../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationParameters.js';
import type { PlantRelationPrimitives } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationPrimitives.js';
import { randomPlantRelationId } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/PlantRelationId.js';
import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import type { MongoPlantRelationDocument } from '../../../../../../src/Contexts/Agro/PlantRelations/infrastructure/persistence/types/MongoPlantRelationDocument.js';
import {
  createPlantId,
  type PlantId
} from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../shared/fixtures/random.js';

const DEFAULT_USER = 'test-curator';
const DEFAULT_DATE = new Date('2026-10-28T12:00:00Z');

const BASE_PARAMS = {
  type: 'beneficial' as const,
  mechanism: 'pest_repellent' as const,
  strength: 4,
  proximity: ProximityDistance.create(0, 50),
  reason: 'Beneficial pest protection synergy',
  user: DEFAULT_USER,
  at: DEFAULT_DATE
};

const BASE_PRIMITIVES = {
  type: 'beneficial' as const,
  mechanism: 'pest_repellent' as const,
  strength: 4,
  proximity: { minDistanceCm: 0, maxDistanceCm: 50 },
  reason: 'Beneficial pest protection synergy',
  metadata: {
    createdAt: DEFAULT_DATE,
    createdBy: DEFAULT_USER,
    updatedAt: DEFAULT_DATE,
    updatedBy: DEFAULT_USER
  },
  version: 0
};

const BASE_MONGO_DOC = {
  type: 'beneficial' as const,
  mechanism: 'pest_repellent' as const,
  strength: 4,
  minDistanceCm: 0,
  maxDistanceCm: 50,
  reason: 'Beneficial companion synergy',
  metadata: {
    createdAt: DEFAULT_DATE,
    createdBy: DEFAULT_USER,
    updatedAt: DEFAULT_DATE,
    updatedBy: DEFAULT_USER
  },
  version: 0
};

export class PlantRelationMother {
  static create(
    overrides: Partial<CreatePlantRelationParams> = {}
  ): PlantRelation {
    const id = overrides.id ?? randomPlantRelationId();
    const sourcePlantId =
      overrides.sourcePlantId ?? createPlantId(random.uuid());
    const targetPlantId =
      overrides.targetPlantId ?? createPlantId(random.uuid());

    return PlantRelation.create({
      ...BASE_PARAMS,
      ...overrides,
      id,
      sourcePlantId,
      targetPlantId
    });
  }

  static beneficial(
    sourcePlantId: PlantId,
    targetPlantId: PlantId,
    overrides: Partial<CreatePlantRelationParams> = {}
  ): PlantRelation {
    return PlantRelationMother.create({
      sourcePlantId,
      targetPlantId,
      type: 'beneficial',
      mechanism: 'pest_repellent',
      reason: 'Protects neighbor from pests',
      ...overrides
    });
  }

  static detrimental(
    sourcePlantId: PlantId,
    targetPlantId: PlantId,
    overrides: Partial<CreatePlantRelationParams> = {}
  ): PlantRelation {
    return PlantRelationMother.create({
      sourcePlantId,
      targetPlantId,
      type: 'detrimental',
      mechanism: 'allelopathy',
      strength: overrides.strength ?? 4,
      proximity: overrides.proximity ?? ProximityDistance.create(0, 150),
      reason: 'Inhibits neighbor growth via allelopathy',
      ...overrides
    });
  }

  static parameters(
    overrides: Partial<PlantRelationParameters> = {}
  ): PlantRelationParameters {
    return {
      type: 'beneficial',
      mechanism: 'pest_repellent',
      strength: 4,
      proximity: ProximityDistance.create(0, 50),
      reason: 'Updated companion parameters',
      ...overrides
    };
  }

  static primitives(
    overrides: Partial<PlantRelationPrimitives> = {}
  ): PlantRelationPrimitives {
    const id = overrides.id ?? random.uuid();
    const sourcePlantId = overrides.sourcePlantId ?? random.uuid();
    const targetPlantId = overrides.targetPlantId ?? random.uuid();

    return {
      ...BASE_PRIMITIVES,
      ...overrides,
      id,
      sourcePlantId,
      targetPlantId
    };
  }

  static mongoDocument(
    overrides: Partial<MongoPlantRelationDocument> = {}
  ): MongoPlantRelationDocument {
    const id = overrides._id ?? toMongoId(random.uuid());
    const sourcePlantId = overrides.sourcePlantId ?? toMongoId(random.uuid());
    const targetPlantId = overrides.targetPlantId ?? toMongoId(random.uuid());

    return {
      ...BASE_MONGO_DOC,
      ...overrides,
      _id: id,
      sourcePlantId,
      targetPlantId
    };
  }
}
