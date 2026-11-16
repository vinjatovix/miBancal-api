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
    this.applyAppliesToFilter(filter, parts);
    this.applySourceScopeFilter(filter, parts);
    this.applyTargetScopeFilter(filter, parts);
    this.applyGenusFilter(filter, parts);
    this.applyFamilyIdFilter(filter, parts);
    this.applyTypeFilter(filter, parts);
    this.applyMechanismFilter(filter, parts);

    return PlantRelationQueryMapper.withOrClauses(parts);
  }

  /**
   * "Applies to this plant": one OR clause matching the plant as source OR
   * target through every resolved tier (plant/genus/family) plus broadcast
   * (`target.scope = all`). A single clause so pagination, order and totals
   * cover the whole hierarchy at once; `source` is never broadcast, so `all`
   * is only matched on `target`.
   */
  private applyAppliesToFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    const appliesTo = filter.appliesTo;
    if (!appliesTo) return;

    const clause: OrClause = [];
    const plantBinary = toMongoId(appliesTo.plantId);
    clause.push(
      { 'source.scope': 'plant', 'source.value': plantBinary },
      { 'target.scope': 'plant', 'target.value': plantBinary }
    );

    if (appliesTo.genus) {
      clause.push(
        { 'source.scope': 'genus', 'source.value': appliesTo.genus },
        { 'target.scope': 'genus', 'target.value': appliesTo.genus }
      );
    }

    if (appliesTo.familyId) {
      const familyBinary = toMongoId(appliesTo.familyId);
      clause.push(
        { 'source.scope': 'family', 'source.value': familyBinary },
        { 'target.scope': 'family', 'target.value': familyBinary }
      );
    }

    clause.push({ 'target.scope': 'all' });

    parts.orClauses.push(clause);
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
        { 'source.scope': 'plant', 'source.value': idBinary },
        { 'target.scope': 'plant', 'target.value': idBinary },
        { sourcePlantId: idBinary },
        { targetPlantId: idBinary }
      ]);
    } else if (filter.plantId?.in) {
      const idsBinary = filter.plantId.in.map(toMongoId);
      parts.orClauses.push([
        { 'source.scope': 'plant', 'source.value': { $in: idsBinary } },
        { 'target.scope': 'plant', 'target.value': { $in: idsBinary } },
        { sourcePlantId: { $in: idsBinary } },
        { targetPlantId: { $in: idsBinary } }
      ]);
    }
  }

  private applySourceScopeFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.sourceScope?.eq) {
      parts.query['source.scope'] = filter.sourceScope.eq;
    } else if (filter.sourceScope?.in) {
      parts.query['source.scope'] = { $in: filter.sourceScope.in };
    }
  }

  private applyTargetScopeFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.targetScope?.eq) {
      parts.query['target.scope'] = filter.targetScope.eq;
    } else if (filter.targetScope?.in) {
      parts.query['target.scope'] = { $in: filter.targetScope.in };
    }
  }

  private applyGenusFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.genus?.eq) {
      parts.orClauses.push([
        { 'source.scope': 'genus', 'source.value': filter.genus.eq },
        { 'target.scope': 'genus', 'target.value': filter.genus.eq }
      ]);
    } else if (filter.genus?.in) {
      parts.orClauses.push([
        { 'source.scope': 'genus', 'source.value': { $in: filter.genus.in } },
        { 'target.scope': 'genus', 'target.value': { $in: filter.genus.in } }
      ]);
    }
  }

  private applyFamilyIdFilter(
    filter: PlantRelationFilter,
    parts: QueryParts
  ): void {
    if (filter.familyId?.eq) {
      const idBinary = toMongoId(filter.familyId.eq);
      parts.orClauses.push([
        { 'source.scope': 'family', 'source.value': idBinary },
        { 'target.scope': 'family', 'target.value': idBinary }
      ]);
    } else if (filter.familyId?.in) {
      const idsBinary = filter.familyId.in.map(toMongoId);
      parts.orClauses.push([
        { 'source.scope': 'family', 'source.value': { $in: idsBinary } },
        { 'target.scope': 'family', 'target.value': { $in: idsBinary } }
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
