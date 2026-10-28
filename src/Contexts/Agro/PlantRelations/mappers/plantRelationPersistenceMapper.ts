import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { createPlantId } from '../../Plants/domain/PlantId.js';
import { PlantRelation } from '../domain/entities/PlantRelation.js';
import { createPlantRelationId } from '../domain/PlantRelationId.js';
import { ProximityDistance } from '../domain/valueObjects/ProximityDistance.js';
import type { MongoPlantRelationDocument } from '../infrastructure/persistence/types/MongoPlantRelationDocument.js';
import type { PlantRelationPersistenceMapper } from './interfaces/PlantRelationPersistenceMapper.js';

export const plantRelationPersistenceMapper: PlantRelationPersistenceMapper = {
  fromMongoDocument(document: MongoPlantRelationDocument): PlantRelation {
    return new PlantRelation({
      id: createPlantRelationId(fromMongoId(document._id)),
      sourcePlantId: createPlantId(fromMongoId(document.sourcePlantId)),
      targetPlantId: createPlantId(fromMongoId(document.targetPlantId)),
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
    return {
      _id: toMongoId(relation.id),
      sourcePlantId: toMongoId(relation.sourcePlantId),
      targetPlantId: toMongoId(relation.targetPlantId),
      type: relation.type,
      mechanism: relation.mechanism,
      strength: relation.strength,
      minDistanceCm: relation.proximity.minDistanceCm,
      maxDistanceCm: relation.proximity.maxDistanceCm,
      reason: relation.reason,
      metadata: relation.metadata.toPrimitives(),
      version: relation.version
    };
  }
};
