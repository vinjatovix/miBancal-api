import type { Db } from 'mongodb';
import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { toMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoReadRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoReadRepository.js';
import type {
  AnomalyField,
  AnomalyReadRepository,
  AnomalyReadView,
  AnomalySparseView
} from '../../application/queries/index.js';
import type { AnomalyFilter } from '../../domain/entities/types/AnomalyFilter.js';
import {
  toAnomalyReadView,
  toAnomalySparseView,
  type StoredAnomalyDocument
} from './anomalyReadViewMapper.js';

export type MongoAnomalyReadRepositoryDependencies = {
  db: Db;
};

// Contract fields only: unknown stored fields never leave the database.
const ANOMALY_PROJECTION = {
  slug: 1,
  name: 1,
  scientificName: 1,
  category: 1,
  description: 1,
  symptoms: 1,
  damage: 1,
  causes: 1,
  affectedCrops: 1,
  prevention: 1,
  treatment: 1,
  naturalEnemies: 1,
  resources: 1,
  confusedWith: 1,
  status: 1,
  deletedAt: 1,
  metadata: 1,
  version: 1
} as const;

const SLUG_PROJECTION = { slug: 1 } as const;

// Same value as `AnomalyStatus.DELETED`; a type-only import keeps the read side
// free of domain values.
const DELETED_STATUS: AnomalyReadView['status'] = 'DELETED';

type StoredAnomalySlug = Pick<StoredAnomalyDocument, 'slug'>;

export class MongoAnomalyReadRepository
  extends MongoReadRepository<
    StoredAnomalyDocument,
    AnomalyFilter,
    AnomalySparseView,
    AnomalyField
  >
  implements AnomalyReadRepository
{
  constructor({ db }: MongoAnomalyReadRepositoryDependencies) {
    super(db);
  }

  protected collectionName(): string {
    return 'anomalies';
  }

  protected projection(): Readonly<Record<string, 1>> {
    return ANOMALY_PROJECTION;
  }

  protected toView(
    document: StoredAnomalyDocument,
    fields?: readonly AnomalyField[]
  ): AnomalySparseView {
    return fields === undefined
      ? toAnomalyReadView(document)
      : toAnomalySparseView(document, fields);
  }

  /** Soft-deleted anomalies are hidden from non-privileged readers. */
  private activeFilter(): UnknownRecord {
    return { status: { $ne: DELETED_STATUS } };
  }

  async findActiveById(
    id: string,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<Nullable<AnomalySparseView>> {
    return this.findOneView(
      { _id: toMongoId(id), ...this.activeFilter() },
      options
    );
  }

  async findBySlug(
    slug: string,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<Nullable<AnomalySparseView>> {
    return this.findOneView({ slug }, options);
  }

  async findActiveBySlug(
    slug: string,
    options: ReadOptions<AnomalyField> = {}
  ): Promise<Nullable<AnomalySparseView>> {
    return this.findOneView({ slug, ...this.activeFilter() }, options);
  }

  async findExistingSlugs(
    slugs: readonly string[]
  ): Promise<readonly string[]> {
    const unique = [...new Set(slugs)];
    if (unique.length === 0) return [];

    const filter: UnknownRecord = {
      slug: { $in: unique },
      ...this.activeFilter()
    };
    const documents = await this.collection()
      .find<StoredAnomalySlug>(filter, { projection: SLUG_PROJECTION })
      .toArray();

    return documents.map((document) => document.slug);
  }
}
