import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { createAnomalyId } from '../domain/AnomalyId.js';
import { Anomaly } from '../domain/entities/Anomaly.js';
import type { MongoAnomalyDocument } from '../infrastructure/persistence/types/MongoAnomalyDocument.js';
import { definedGuidance } from './guidanceFields.js';
import type { AnomalyPersistenceMapper } from './interfaces/AnomalyPersistenceMapper.js';

export const anomalyPersistenceMapper: AnomalyPersistenceMapper = {
  fromMongoDocument(document: MongoAnomalyDocument): Anomaly {
    return Anomaly.create({
      id: createAnomalyId(fromMongoId(document._id)),
      slug: document.slug,
      name: document.name,
      category: document.category,
      ...definedGuidance(document),
      status: document.status,
      ...(document.deletedAt
        ? { deletedAt: new Date(document.deletedAt) }
        : {}),
      metadata: Metadata.fromPrimitives(document.metadata),
      version: document.version
    });
  },

  toMongoDocument(anomaly: Anomaly): MongoAnomalyDocument {
    return {
      _id: toMongoId(anomaly.id),
      slug: anomaly.slug,
      name: anomaly.name,
      category: anomaly.category,
      ...definedGuidance(anomaly),
      status: anomaly.status,
      ...(anomaly.deletedAt ? { deletedAt: anomaly.deletedAt } : {}),
      metadata: anomaly.metadata.toPrimitives(),
      version: anomaly.version
    };
  }
};
