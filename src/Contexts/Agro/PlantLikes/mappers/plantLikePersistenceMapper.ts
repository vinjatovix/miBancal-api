import { createUserId } from '../../../Auth/domain/UserId.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { createPlantId } from '../../Plants/domain/PlantId.js';
import { PlantLike } from '../domain/entities/PlantLike.js';
import { createPlantLikeId } from '../domain/PlantLikeId.js';
import type { MongoPlantLikeDocument } from '../infrastructure/persistence/types/MongoPlantLikeDocument.js';
import type { PlantLikePersistenceMapper } from './interfaces/PlantLikePersistenceMapper.js';

export const plantLikePersistenceMapper: PlantLikePersistenceMapper = {
  fromMongoDocument(document: MongoPlantLikeDocument): PlantLike {
    return new PlantLike({
      id: createPlantLikeId(fromMongoId(document._id)),
      userId: createUserId(fromMongoId(document.userId)),
      plantId: createPlantId(fromMongoId(document.plantId)),
      likedAt: new Date(document.likedAt)
    });
  },

  toMongoDocument(like: PlantLike): MongoPlantLikeDocument {
    return {
      _id: toMongoId(like.id),
      userId: toMongoId(like.userId),
      plantId: toMongoId(like.plantId),
      likedAt: like.likedAt
    };
  }
};
