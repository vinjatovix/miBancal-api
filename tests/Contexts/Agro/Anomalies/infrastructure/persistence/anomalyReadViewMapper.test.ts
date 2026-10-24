import {
  toAnomalyReadView,
  toAnomalySparseView
} from '../../../../../../src/Contexts/Agro/Anomalies/infrastructure/persistence/anomalyReadViewMapper.js';
import { AnomalyScenarios } from '../../domain/mothers/AnomalyScenarios.js';

describe('anomalyReadViewMapper', () => {
  it('projects the contract fields and omits deletedAt for an active anomaly', () => {
    const view = toAnomalyReadView(AnomalyScenarios.storedBase());

    expect(view.status).toBe('ACTIVE');
    expect(view.slug).toBe('pulgon');
    expect(view.category).toBe('pest');
    expect(view.version).toBe(0);
    expect(view).not.toHaveProperty('deletedAt');
    expect(view.metadata.createdAt).toBeInstanceOf(Date);
  });

  it('exposes deletedAt as an ISO string for a deleted anomaly', () => {
    const deletedAt = new Date();
    const view = toAnomalyReadView(
      AnomalyScenarios.storedBase({ status: 'DELETED', deletedAt })
    );

    expect(view.status).toBe('DELETED');
    expect(view.deletedAt).toBe(deletedAt.toISOString());
  });

  it('returns only id and the requested fields for a sparse view', () => {
    const sparse = toAnomalySparseView(AnomalyScenarios.storedBase(), [
      'slug',
      'name'
    ]);

    expect(Object.keys(sparse).sort()).toEqual(['id', 'name', 'slug']);
  });
});
