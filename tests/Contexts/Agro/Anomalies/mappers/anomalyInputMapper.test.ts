import { anomalyInputMapper } from '../../../../../src/Contexts/Agro/Anomalies/mappers/anomalyInputMapper.js';
import { AnomalyScenarios } from '../domain/mothers/AnomalyScenarios.js';

const USER = 'curator';

describe('anomalyInputMapper', () => {
  it('builds an active aggregate from a create DTO', () => {
    const dto = AnomalyScenarios.createDtoBase();

    const anomaly = anomalyInputMapper.fromCreateDto(dto, USER);

    expect(anomaly.idValue).toBe(dto.id);
    expect(anomaly.slug).toBe(dto.slug);
    expect(anomaly.category).toBe(dto.category);
    expect(anomaly.metadata.toPrimitives().createdBy).toBe(USER);
    expect(anomaly.version).toBe(0);
  });

  it('maps only defined changes, keeping null as a clear', () => {
    const changes = anomalyInputMapper.toChanges({
      idOrSlug: 'pulgon',
      name: 'Áfido',
      description: null,
      symptoms: ['A']
    });

    expect(changes).toEqual({
      name: 'Áfido',
      description: null,
      symptoms: ['A']
    });
    expect(changes).not.toHaveProperty('idOrSlug');
  });
});
