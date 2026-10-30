import type { Binary } from 'bson';
import type { Db } from 'mongodb';
import type { PaginatedResult } from '../../../../../shared/domain/query/interfaces/PaginatedResult.js';
import type { QueryOptions } from '../../../../../shared/domain/query/interfaces/QueryOptions.js';
import { fromMongoId } from '../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { MongoReadRepository } from '../../../../shared/infrastructure/persistence/mongo/MongoReadRepository.js';
import type {
  PlantRelationField,
  PlantRelationReadRepository,
  PlantRelationReadView
} from '../../application/queries/index.js';
import type { PlantRelationFilter } from '../../domain/entities/types/PlantRelationFilter.js';
import type { TaxonomicScopeType } from '../../domain/valueObjects/types/TaxonomicScopePrimitives.js';
import { PlantRelationQueryMapper } from './mappers/PlantRelationQueryMapper.js';
import type { MongoPlantRelationDocument } from './types/MongoPlantRelationDocument.js';

export type MongoPlantRelationReadRepositoryDependencies = {
  db: Db;
  plantRelationQueryMapper: PlantRelationQueryMapper;
};

const PLANT_RELATION_PROJECTION = {
  source: 1,
  target: 1,
  sourcePlantId: 1,
  targetPlantId: 1,
  type: 1,
  mechanism: 1,
  strength: 1,
  minDistanceCm: 1,
  maxDistanceCm: 1,
  reason: 1,
  metadata: 1,
  version: 1
} as const;

type StoredId = Binary | string;

const toScopePrimitives = <S extends TaxonomicScopeType>(
  stored: { scope: S; value?: StoredId } | undefined,
  legacyPlantId: StoredId | undefined
): { scope: S | 'plant'; value?: string } => {
  if (!stored) {
    return { scope: 'plant', value: fromMongoId(legacyPlantId) };
  }

  return {
    scope: stored.scope,
    ...(stored.value !== undefined ? { value: fromMongoId(stored.value) } : {})
  };
};

const toPlantId = (
  scope: { scope: string; value?: string },
  legacyPlantId: StoredId | undefined
): string | undefined => {
  if (scope.scope === 'plant' && scope.value) return scope.value;

  return legacyPlantId ? fromMongoId(legacyPlantId) : undefined;
};

export class MongoPlantRelationReadRepository
  extends MongoReadRepository<
    MongoPlantRelationDocument,
    PlantRelationFilter,
    PlantRelationReadView,
    PlantRelationField
  >
  implements PlantRelationReadRepository
{
  private readonly queryMapper: PlantRelationQueryMapper;

  constructor({
    db,
    plantRelationQueryMapper
  }: MongoPlantRelationReadRepositoryDependencies) {
    super(db);
    this.queryMapper = plantRelationQueryMapper;
  }

  protected collectionName(): string {
    return 'plant_relations';
  }

  protected projection(): Readonly<Record<string, 1>> {
    return PLANT_RELATION_PROJECTION;
  }

  protected toView(
    document: MongoPlantRelationDocument,
    _fields?: readonly PlantRelationField[]
  ): PlantRelationReadView {
    const source = toScopePrimitives(document.source, document.sourcePlantId);
    const target = toScopePrimitives(document.target, document.targetPlantId);
    const sourcePlantId = toPlantId(source, document.sourcePlantId);
    const targetPlantId = toPlantId(target, document.targetPlantId);

    return {
      id: fromMongoId(document._id),
      source,
      target,
      ...(sourcePlantId !== undefined ? { sourcePlantId } : {}),
      ...(targetPlantId !== undefined ? { targetPlantId } : {}),
      type: document.type,
      mechanism: document.mechanism,
      strength: document.strength,
      proximity: {
        minDistanceCm: document.minDistanceCm,
        maxDistanceCm: document.maxDistanceCm
      },
      reason: document.reason,
      metadata: {
        createdAt: document.metadata.createdAt,
        createdBy: document.metadata.createdBy,
        updatedAt: document.metadata.updatedAt,
        updatedBy: document.metadata.updatedBy
      },
      version: document.version
    };
  }

  protected override toMongoFilter(
    filter?: PlantRelationFilter
  ): Record<string, unknown> {
    return this.queryMapper.toMongo(filter);
  }

  protected override toMongoSortField(key: string): string {
    return this.queryMapper.toSortField(key);
  }

  protected override async findPage(
    options: Partial<QueryOptions<PlantRelationFilter, PlantRelationField>>
  ): Promise<PaginatedResult<PlantRelationReadView>> {
    const hasSort = options.sort && Object.keys(options.sort).length > 0;
    const effectiveSort = hasSort
      ? {
          ...options.sort,
          ...(options.sort?.id ? {} : { id: 'asc' as const })
        }
      : { createdAt: 'desc' as const, id: 'asc' as const };

    return super.findPage({
      ...options,
      sort: effectiveSort
    });
  }
}
