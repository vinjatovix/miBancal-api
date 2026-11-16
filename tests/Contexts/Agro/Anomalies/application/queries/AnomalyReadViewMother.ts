import type { AnomalyReadView } from '../../../../../../src/Contexts/Agro/Anomalies/application/queries/index.js';
import { toAnomalyReadView } from '../../../../../../src/Contexts/Agro/Anomalies/infrastructure/persistence/anomalyReadViewMapper.js';
import { AnomalyScenarios } from '../../domain/mothers/AnomalyScenarios.js';

/** Read views built from the anomaly scenarios, the way storage holds them. */
export const AnomalyReadViewMother = {
  base(): AnomalyReadView {
    return toAnomalyReadView(AnomalyScenarios.storedBase());
  },

  deleted(): AnomalyReadView {
    return toAnomalyReadView(
      AnomalyScenarios.storedBase({ status: 'DELETED', deletedAt: new Date() })
    );
  },

  withSlug(slug: string): AnomalyReadView {
    return toAnomalyReadView(AnomalyScenarios.storedBase({ slug }));
  }
};
