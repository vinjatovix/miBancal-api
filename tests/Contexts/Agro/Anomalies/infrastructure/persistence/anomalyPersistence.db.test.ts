import { asClass } from 'awilix';
import type { Binary } from 'mongodb';
import type { AnomalyRepository } from '../../../../../../src/Contexts/Agro/Anomalies/domain/repositories/interfaces/AnomalyRepository.js';
import { MongoAnomalyRepository } from '../../../../../../src/Contexts/Agro/Anomalies/infrastructure/persistence/MongoAnomalyRepository.js';
import { anomalyDomainMapper } from '../../../../../../src/Contexts/Agro/Anomalies/mappers/anomalyDomainMapper.js';
import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { SupportResourceBuilder } from '../../../shared/domain/supportResource/SupportResourceBuilder.js';
import { AnomalyScenarios } from '../../domain/mothers/AnomalyScenarios.js';

const USER = 'curator';

let context: DbTestContext;
let repository: AnomalyRepository;

type StoredAnomaly = { _id: Binary | string } & Record<string, unknown>;

const readStored = (id: string): Promise<StoredAnomaly | null> =>
  context.db
    .collection<StoredAnomaly>('anomalies')
    .findOne({ _id: toMongoId(id) });

describe('Anomaly persistence of resources and confusedWith', () => {
  beforeAll(async () => {
    context = await createDbTestContext({
      anomalyRepository: asClass(MongoAnomalyRepository).singleton()
    });
    repository =
      context.container.resolve<AnomalyRepository>('anomalyRepository');
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  it('persists resources and confusedWith', async () => {
    const anomaly = AnomalyScenarios.domainBase({
      resources: [SupportResourceBuilder.image()],
      confusedWith: ['mildiu']
    });

    await repository.save(anomaly);

    const stored = await readStored(anomaly.idValue);
    expect(stored?.resources).toHaveLength(1);
    expect(stored?.confusedWith).toStrictEqual(['mildiu']);
  });

  it('clears both fields with $unset, leaving no key and no null/[] residue', async () => {
    const anomaly = AnomalyScenarios.domainBase({
      resources: [SupportResourceBuilder.image()],
      confusedWith: ['mildiu']
    });
    await repository.save(anomaly);

    const before = anomalyDomainMapper.toPrimitives(anomaly);
    anomaly.updateGuidance({ resources: null, confusedWith: null }, USER);
    const after = anomalyDomainMapper.toPrimitives(anomaly);

    await repository.updateWithDiff(before, after);

    const stored = await readStored(anomaly.idValue);
    expect(stored).not.toHaveProperty('resources');
    expect(stored).not.toHaveProperty('confusedWith');
  });

  it('stores an empty collection as absent (no key) rather than []', async () => {
    const anomaly = AnomalyScenarios.domainBase({
      confusedWith: ['mildiu']
    });
    await repository.save(anomaly);

    const before = anomalyDomainMapper.toPrimitives(anomaly);
    anomaly.updateGuidance({ confusedWith: [] }, USER);
    const after = anomalyDomainMapper.toPrimitives(anomaly);

    await repository.updateWithDiff(before, after);

    const stored = await readStored(anomaly.idValue);
    expect(stored).not.toHaveProperty('confusedWith');
  });
});
