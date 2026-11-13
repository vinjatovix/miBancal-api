import type { PlantLike } from '../../domain/entities/PlantLike.js';
import type { MongoPlantLikeDocument } from '../../infrastructure/persistence/types/MongoPlantLikeDocument.js';

export interface PlantLikePersistenceMapper {
  toMongoDocument(like: PlantLike): MongoPlantLikeDocument;
  fromMongoDocument(document: MongoPlantLikeDocument): PlantLike;
}
