import { Anomaly } from '../../../../../src/Contexts/Agro/Anomalies/domain/entities/Anomaly.js';
import { AnomalyStatus } from '../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyStatus.js';
import { anomalyDomainMapper } from '../../../../../src/Contexts/Agro/Anomalies/mappers/anomalyDomainMapper.js';
import { anomalyPersistenceMapper } from '../../../../../src/Contexts/Agro/Anomalies/mappers/anomalyPersistenceMapper.js';
import { AnomalyScenarios } from '../domain/mothers/AnomalyScenarios.js';

describe('anomalyPersistenceMapper', () => {
  it('rebuilds an Anomaly from a Mongo document', () => {
    const document = AnomalyScenarios.mongoBase();

    const anomaly = anomalyPersistenceMapper.fromMongoDocument(document);

    expect(anomaly).toBeInstanceOf(Anomaly);
    expect(anomaly.slug).toBe(document.slug);
    expect(anomaly.category).toBe(document.category);
  });

  it('omits empty optional guidance and the deletedAt of an active anomaly', () => {
    const anomaly = AnomalyScenarios.domainBase({ symptoms: [] });

    const document = anomalyPersistenceMapper.toMongoDocument(anomaly);

    expect(document).not.toHaveProperty('symptoms');
    expect(document).not.toHaveProperty('deletedAt');
  });

  it('keeps deletedAt as a Date for a deleted anomaly', () => {
    const anomaly = AnomalyScenarios.domainDeleted();

    const document = anomalyPersistenceMapper.toMongoDocument(anomaly);

    expect(document.deletedAt).toBeInstanceOf(Date);
    expect(document.status).toBe('DELETED');
  });

  it('hydrates a string deletedAt (soft-delete diff path) as a Date', () => {
    const deletedAt = '2026-01-01T00:00:00.000Z';
    const document = AnomalyScenarios.mongoBase({
      status: AnomalyStatus.DELETED,
      deletedAt
    });

    const anomaly = anomalyPersistenceMapper.fromMongoDocument(document);

    expect(anomaly.deletedAt).toBeInstanceOf(Date);
    expect(anomalyDomainMapper.toPrimitives(anomaly).deletedAt).toBe(deletedAt);
  });
});
