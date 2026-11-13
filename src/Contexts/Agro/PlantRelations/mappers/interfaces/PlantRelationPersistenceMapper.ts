import type { PlantRelation } from '../../domain/entities/PlantRelation.js';
import type { MongoPlantRelationDocument } from '../../infrastructure/persistence/types/MongoPlantRelationDocument.js';

export interface PlantRelationPersistenceMapper {
  fromMongoDocument(document: MongoPlantRelationDocument): PlantRelation;
  toMongoDocument(relation: PlantRelation): MongoPlantRelationDocument;
}
