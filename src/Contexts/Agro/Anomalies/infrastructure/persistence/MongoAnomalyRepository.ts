import type { Db } from 'mongodb';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { MongoCrudRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoCrudRepository.js';
import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { AnomalyFilter } from '../../domain/entities/types/AnomalyFilter.js';
import type { AnomalyPrimitives } from '../../domain/entities/types/AnomalyPrimitives.js';
import { AnomalyStatus } from '../../domain/entities/types/AnomalyStatus.js';
import type { AnomalyRepository } from '../../domain/repositories/interfaces/AnomalyRepository.js';
import type { AnomalyPersistenceMapper } from '../../mappers/interfaces/AnomalyPersistenceMapper.js';
import type { MongoAnomalyDocument } from './types/MongoAnomalyDocument.js';

export type MongoAnomalyRepositoryDependencies = {
  db: Db;
  anomalyPersistenceMapper: AnomalyPersistenceMapper;
};

export class MongoAnomalyRepository
  extends MongoCrudRepository<
    Anomaly,
    AnomalyPrimitives,
    MongoAnomalyDocument,
    AnomalyFilter
  >
  implements AnomalyRepository
{
  private readonly anomalyPersistenceMapper: AnomalyPersistenceMapper;

  constructor({
    db,
    anomalyPersistenceMapper
  }: MongoAnomalyRepositoryDependencies) {
    super(db);
    this.anomalyPersistenceMapper = anomalyPersistenceMapper;
  }

  protected entityName(): string {
    return 'Anomaly';
  }

  protected collectionName(): string {
    return 'anomalies';
  }

  protected toDomain(document: MongoAnomalyDocument): Anomaly {
    return this.anomalyPersistenceMapper.fromMongoDocument(document);
  }

  protected toMongoDocument(anomaly: Anomaly): MongoAnomalyDocument {
    return this.anomalyPersistenceMapper.toMongoDocument(anomaly);
  }

  protected activeFilter(): UnknownRecord {
    return { status: { $ne: AnomalyStatus.DELETED } };
  }

  async findBySlug(slug: string): Promise<Nullable<Anomaly>> {
    const document = await this.collection().findOne<MongoAnomalyDocument>(
      { slug },
      this.sessionOptions()
    );

    return document === null ? null : this.toDomain(document);
  }

  async findActiveBySlug(slug: string): Promise<Nullable<Anomaly>> {
    return this.findOneDomain({ slug, ...this.activeFilter() });
  }
}
