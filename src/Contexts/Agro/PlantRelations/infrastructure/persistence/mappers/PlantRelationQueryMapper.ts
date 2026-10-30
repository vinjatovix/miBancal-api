import { toMongoId } from '../../../../../shared/infrastructure/persistence/mongo/MongoId.js';
import type { PlantRelationFilter } from '../../../domain/entities/types/PlantRelationFilter.js';

type MongoQuery = Record<string, unknown>;
type OrClause = MongoQuery[];
type QueryParts = { query: MongoQuery; orClauses: OrClause[] };

export class PlantRelationQueryMapper {
  toSortField(key: string): string {
    if (key === 'createdAt') return 'metadata.createdAt';
    if (key === 'id') return '_id';
    return key;
  }

  toMongo(filter?: PlantRelationFilter): MongoQuery {
    const parts: QueryParts = { query: {}, orClauses: [] };

    if (!filter) return parts.query;

    this.applySourcePlantFilter(filter, parts);
    this.applyTargetPlantFilter(filter, parts);
    this.applyPlantIdFilter(filter, parts);
    this.applyTypeFilter(filter, parts);
    this.applyMechanismFilter(filter, parts);

    return PlantRelationQueryMapper.withOrClauses(parts);
  }

  private applySourcePlantFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.sourcePlantId?.eq) {
      parts.query.sourcePlantId = toMongoId(filter.sourcePlantId.eq);
    } else if (filter.sourcePlantId?.in) {
      parts.query.sourcePlantId = {
        $in: filter.sourcePlantId.in.map(toMongoId)
      };
    }
  }

  private applyTargetPlantFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.targetPlantId?.eq) {
      parts.query.targetPlantId = toMongoId(filter.targetPlantId.eq);
    } else if (filter.targetPlantId?.in) {
      parts.query.targetPlantId = {
        $in: filter.targetPlantId.in.map(toMongoId)
      };
    }
  }

  private applyPlantIdFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.plantId?.eq) {
      const idBinary = toMongoId(filter.plantId.eq);
      parts.orClauses.push([
        { sourcePlantId: idBinary },
        { targetPlantId: idBinary }
      ]);
    } else if (filter.plantId?.in) {
      const idsBinary = filter.plantId.in.map(toMongoId);
      parts.orClauses.push([
        { sourcePlantId: { $in: idsBinary } },
        { targetPlantId: { $in: idsBinary } }
      ]);
    }
  }

  private applyTypeFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.type?.eq) {
      parts.query.type = filter.type.eq;
    } else if (filter.type?.in) {
      parts.query.type = { $in: filter.type.in };
    }
  }

  private applyMechanismFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.mechanism?.eq) {
      parts.query.mechanism = filter.mechanism.eq;
    } else if (filter.mechanism?.in) {
      parts.query.mechanism = { $in: filter.mechanism.in };
    }
  }

  private static withOrClauses({ query, orClauses }: QueryParts): MongoQuery {
    if (orClauses.length === 0) return query;
    if (orClauses.length === 1 && Object.keys(query).length === 0) {
      return { $or: orClauses[0] };
    }
    if (orClauses.length === 1) {
      return { ...query, $or: orClauses[0] };
    }

    return {
      ...query,
      $and: orClauses.map((clause) => ({ $or: clause }))
    };
  }
}
