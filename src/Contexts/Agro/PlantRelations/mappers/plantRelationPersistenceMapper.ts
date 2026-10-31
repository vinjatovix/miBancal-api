import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { PlantRelation } from '../domain/entities/PlantRelation.js';
import { createPlantRelationId } from '../domain/PlantRelationId.js';
import { ProximityDistance } from '../domain/valueObjects/ProximityDistance.js';
import { TaxonomicScope } from '../domain/valueObjects/TaxonomicScope.js';
import type { MongoPlantRelationDocument } from '../infrastructure/persistence/types/MongoPlantRelationDocument.js';
import type { PlantRelationPersistenceMapper } from './interfaces/PlantRelationPersistenceMapper.js';

export const plantRelationPersistenceMapper: PlantRelationPersistenceMapper = {
  fromMongoDocument(document: MongoPlantRelationDocument): PlantRelation {
    const source = document.source
      ? TaxonomicScope.fromPrimitives({
          scope: document.source.scope,
          ...(document.source.value !== undefined
            ? { value: fromMongoId(document.source.value) }
            : {})
        })
      : TaxonomicScope.plant(fromMongoId(document.sourcePlantId!));

    const target = document.target
      ? TaxonomicScope.fromPrimitives({
          scope: document.target.scope,
          ...(document.target.value !== undefined
            ? { value: fromMongoId(document.target.value) }
            : {})
        })
      : TaxonomicScope.plant(fromMongoId(document.targetPlantId!));

    return new PlantRelation({
      id: createPlantRelationId(fromMongoId(document._id)),
      source,
      target,
      type: document.type,
      mechanism: document.mechanism,
      strength: document.strength,
      proximity: ProximityDistance.create(
        document.minDistanceCm,
        document.maxDistanceCm
      ),
      reason: document.reason,
      metadata: Metadata.fromPrimitives(document.metadata),
      version: document.version
    });
  },

  toMongoDocument(relation: PlantRelation): MongoPlantRelationDocument {
    const sourceValue =
      relation.source.value !== undefined
        ? toMongoId(relation.source.value)
        : undefined;
    const targetValue =
      relation.target.value !== undefined
        ? toMongoId(relation.target.value)
        : undefined;

    const document: MongoPlantRelationDocument = {
      _id: toMongoId(relation.id),
      source: {
        scope: relation.source.scope as 'plant' | 'genus' | 'family',
        ...(sourceValue !== undefined ? { value: sourceValue } : {})
      },
      target: {
        scope: relation.target.scope,
        ...(targetValue !== undefined ? { value: targetValue } : {})
      },
      type: relation.type,
      mechanism: relation.mechanism,
      strength: relation.strength,
      minDistanceCm: relation.proximity.minDistanceCm,
      maxDistanceCm: relation.proximity.maxDistanceCm,
      reason: relation.reason,
      metadata: relation.metadata.toPrimitives(),
      version: relation.version
    };

    if (relation.source.isPlant() && relation.source.value) {
      document.sourcePlantId = toMongoId(relation.source.value);
    }
    if (relation.target.isPlant() && relation.target.value) {
      document.targetPlantId = toMongoId(relation.target.value);
    }

    return document;
  }
};
