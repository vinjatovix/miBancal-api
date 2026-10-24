import type { CreateAnomalyDto } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/interfaces/CreateAnomalyDto.js';
import { createAnomalyId } from '../../../../../../src/Contexts/Agro/Anomalies/domain/AnomalyId.js';
import { Anomaly } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/Anomaly.js';
import type { AnomalyPrimitives } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyPrimitives.js';
import type { AnomalyProps } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyProps.js';
import { AnomalyStatus } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyStatus.js';
import type { StoredAnomalyDocument } from '../../../../../../src/Contexts/Agro/Anomalies/infrastructure/persistence/anomalyReadViewMapper.js';
import type { MongoAnomalyDocument } from '../../../../../../src/Contexts/Agro/Anomalies/infrastructure/persistence/types/MongoAnomalyDocument.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../shared/fixtures/random.js';

const USER = 'test-user';

const ANOMALY_BASE_VALUES = {
  slug: 'pulgon',
  name: 'Pulgón',
  category: 'pest' as const,
  scientificName: 'Aphidoidea',
  description: 'Small sap-sucking insects that colonise tender shoots.',
  symptoms: ['Curled leaves', 'Sticky honeydew'],
  damage: ['Weakens the plant'],
  causes: ['Warm dry weather'],
  affectedCrops: ['Tomato', 'Pepper'],
  prevention: ['Encourage natural enemies'],
  treatment: ['Potassium soap'],
  naturalEnemies: ['Ladybugs']
};

export const AnomalyScenarios = {
  domainBase: (overrides?: Partial<AnomalyProps>): Anomaly =>
    Anomaly.create({
      id: createAnomalyId(random.uuid()),
      ...ANOMALY_BASE_VALUES,
      metadata: Metadata.create(USER),
      ...overrides
    }),

  domainDeleted: (overrides?: Partial<AnomalyProps>): Anomaly =>
    Anomaly.create({
      id: createAnomalyId(random.uuid()),
      ...ANOMALY_BASE_VALUES,
      status: AnomalyStatus.DELETED,
      deletedAt: new Date(),
      metadata: Metadata.create(USER),
      ...overrides
    }),

  createDtoBase: (overrides?: Partial<CreateAnomalyDto>): CreateAnomalyDto => ({
    id: random.uuid(),
    ...ANOMALY_BASE_VALUES,
    ...overrides
  }),

  primitivesBase: (
    overrides?: Partial<AnomalyPrimitives>
  ): AnomalyPrimitives => ({
    id: random.uuid(),
    ...ANOMALY_BASE_VALUES,
    status: AnomalyStatus.ACTIVE,
    metadata: Metadata.create(USER).toPrimitives(),
    version: 0,
    ...overrides
  }),

  mongoBase: (
    overrides?: Partial<MongoAnomalyDocument>
  ): MongoAnomalyDocument => ({
    _id: toMongoId(random.uuid()),
    ...ANOMALY_BASE_VALUES,
    status: AnomalyStatus.ACTIVE,
    metadata: Metadata.create(USER).toPrimitives(),
    version: 0,
    ...overrides
  }),

  storedBase: (
    overrides?: Partial<StoredAnomalyDocument>
  ): StoredAnomalyDocument => ({
    _id: toMongoId(random.uuid()),
    ...ANOMALY_BASE_VALUES,
    status: 'ACTIVE',
    metadata: Metadata.create(USER).toPrimitives(),
    version: 0,
    ...overrides
  })
};
