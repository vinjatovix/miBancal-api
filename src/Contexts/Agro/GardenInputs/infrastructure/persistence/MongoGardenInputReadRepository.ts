import type { Db } from 'mongodb';
import type { ReadOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import type { Nullable } from '../../../../../shared/domain/types/Nullable.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { toMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoReadRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoReadRepository.js';
import type {
  GardenInputField,
  GardenInputReadRepository,
  GardenInputReadView,
  GardenInputSparseView
} from '../../application/queries/index.js';
import type { GardenInputFilter } from '../../domain/entities/types/GardenInputFilter.js';
import {
  toGardenInputReadView,
  toGardenInputSparseView,
  type StoredGardenInputDocument
} from './gardenInputReadViewMapper.js';

export type MongoGardenInputReadRepositoryDependencies = {
  db: Db;
};

const GARDEN_INPUT_PROJECTION = {
  slug: 1,
  name: 1,
  description: 1,
  category: 1,
  actions: 1,
  activeIngredients: 1,
  nutrients: 1,
  targets: 1,
  recipes: 1,
  resources: 1,
  status: 1,
  deletedAt: 1,
  metadata: 1,
  version: 1
} as const;

const SLUG_PROJECTION = { slug: 1 } as const;

const DELETED_STATUS: GardenInputReadView['status'] = 'deleted';

type StoredGardenInputSlug = Pick<StoredGardenInputDocument, 'slug'>;

export class MongoGardenInputReadRepository
  extends MongoReadRepository<
    StoredGardenInputDocument,
    GardenInputFilter,
    GardenInputSparseView,
    GardenInputField
  >
  implements GardenInputReadRepository
{
  constructor({ db }: MongoGardenInputReadRepositoryDependencies) {
    super(db);
  }

  protected collectionName(): string {
    return 'gardenInputs';
  }

  protected projection(): Readonly<Record<string, 1>> {
    return GARDEN_INPUT_PROJECTION;
  }

  protected toView(
    document: StoredGardenInputDocument,
    fields?: readonly GardenInputField[]
  ): GardenInputSparseView {
    return fields === undefined
      ? toGardenInputReadView(document)
      : toGardenInputSparseView(document, fields);
  }

  private activeFilter(): UnknownRecord {
    return { status: { $ne: DELETED_STATUS } };
  }

  protected override toMongoFilter(
    filter?: GardenInputFilter
  ): Record<string, unknown> {
    const mongoFilter = super.toMongoFilter(filter);
    if ('action' in mongoFilter) {
      mongoFilter.actions = mongoFilter.action;
      delete mongoFilter.action;
    }
    return mongoFilter;
  }

  protected override toMongoSortField(key: string): string {
    return key === 'id' ? '_id' : key;
  }

  async findActiveById(
    id: string,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<Nullable<GardenInputSparseView>> {
    return this.findOneView(
      { _id: toMongoId(id), ...this.activeFilter() },
      options
    );
  }

  async findBySlug(
    slug: string,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<Nullable<GardenInputSparseView>> {
    return this.findOneView({ slug }, options);
  }

  async findActiveBySlug(
    slug: string,
    options: ReadOptions<GardenInputField> = {}
  ): Promise<Nullable<GardenInputSparseView>> {
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
      .find<StoredGardenInputSlug>(filter, { projection: SLUG_PROJECTION })
      .toArray();

    return documents.map((document) => document.slug);
  }
}
