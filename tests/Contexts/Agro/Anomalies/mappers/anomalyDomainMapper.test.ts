import { Anomaly } from '../../../../../src/Contexts/Agro/Anomalies/domain/entities/Anomaly.js';
import { anomalyDomainMapper } from '../../../../../src/Contexts/Agro/Anomalies/mappers/anomalyDomainMapper.js';
import { AnomalyScenarios } from '../domain/mothers/AnomalyScenarios.js';

describe('anomalyDomainMapper', () => {
  it('rebuilds an Anomaly from primitives (round-trip)', () => {
    const primitives = AnomalyScenarios.primitivesBase();

    const anomaly = anomalyDomainMapper.fromPrimitives(primitives);

    expect(anomaly).toBeInstanceOf(Anomaly);
    expect(anomalyDomainMapper.toPrimitives(anomaly)).toEqual(primitives);
  });

  it('omits empty optional guidance from primitives', () => {
    const anomaly = AnomalyScenarios.domainBase({
      symptoms: [],
      naturalEnemies: []
    });

    const primitives = anomalyDomainMapper.toPrimitives(anomaly);

    expect(primitives).not.toHaveProperty('symptoms');
    expect(primitives).not.toHaveProperty('naturalEnemies');
    expect(primitives).not.toHaveProperty('deletedAt');
  });

  it('serialises deletedAt as an ISO string for a deleted anomaly', () => {
    const anomaly = AnomalyScenarios.domainDeleted();

    const primitives = anomalyDomainMapper.toPrimitives(anomaly);

    expect(typeof primitives.deletedAt).toBe('string');
    expect(primitives.status).toBe('DELETED');
  });
});
