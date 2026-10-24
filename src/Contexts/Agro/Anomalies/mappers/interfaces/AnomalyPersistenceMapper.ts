import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { MongoAnomalyDocument } from '../../infrastructure/persistence/types/MongoAnomalyDocument.js';

export interface AnomalyPersistenceMapper {
  fromMongoDocument(document: MongoAnomalyDocument): Anomaly;
  toMongoDocument(anomaly: Anomaly): MongoAnomalyDocument;
}
