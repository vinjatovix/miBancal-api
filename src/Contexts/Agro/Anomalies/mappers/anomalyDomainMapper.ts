import { Metadata } from '../../../shared/domain/valueObject/index.js';
import { createAnomalyId } from '../domain/AnomalyId.js';
import { Anomaly } from '../domain/entities/Anomaly.js';
import { definedGuidance } from './guidanceFields.js';
import type { AnomalyDomainMapper } from './interfaces/AnomalyDomainMapper.js';

export const anomalyDomainMapper: AnomalyDomainMapper = {
  toPrimitives(anomaly) {
    return {
      id: anomaly.id,
      slug: anomaly.slug,
      name: anomaly.name,
      category: anomaly.category,
      ...definedGuidance(anomaly),
      status: anomaly.status,
      ...(anomaly.deletedAt
        ? { deletedAt: anomaly.deletedAt.toISOString() }
        : {}),
      metadata: anomaly.metadata.toPrimitives(),
      version: anomaly.version
    };
  },

  fromPrimitives(primitives) {
    return Anomaly.create({
      id: createAnomalyId(primitives.id),
      slug: primitives.slug,
      name: primitives.name,
      category: primitives.category,
      ...definedGuidance(primitives),
      status: primitives.status,
      ...(primitives.deletedAt
        ? { deletedAt: new Date(primitives.deletedAt) }
        : {}),
      metadata: Metadata.fromPrimitives(primitives.metadata),
      version: primitives.version
    });
  }
};
