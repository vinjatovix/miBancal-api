import { createUserId } from '../../../Auth/domain/UserId.js';
import { Metadata } from '../../../shared/domain/valueObject/Metadata.js';
import {
  fromMongoId,
  toMongoId
} from '../../../shared/infrastructure/persistence/mongo/MongoId.js';
import { Location } from '../domain/entities/Location.js';
import { createLocationId } from '../domain/LocationId.js';
import type { LocationPersistenceMapper } from './interfaces/LocationPersistenceMapper.js';

export const locationPersistenceMapper: LocationPersistenceMapper = {
  fromMongoDocument(document) {
    return Location.create({
      id: createLocationId(fromMongoId(document._id)),
      userId: createUserId(fromMongoId(document.userId)),
      name: document.name,
      ...(document.latitude != null && { latitude: document.latitude }),
      ...(document.longitude != null && { longitude: document.longitude }),
      ...(document.canvasWidth != null && {
        canvasWidth: document.canvasWidth
      }),
      ...(document.canvasHeight != null && {
        canvasHeight: document.canvasHeight
      }),
      ...(document.northAngle != null && { northAngle: document.northAngle }),
      status: document.status,
      ...(document.deletedAt !== undefined && {
        deletedAt: new Date(document.deletedAt)
      }),
      metadata: Metadata.fromPrimitives(document.metadata),
      version: document.version
    });
  },

  toMongoDocument(location) {
    return {
      _id: toMongoId(location.id),
      userId: toMongoId(location.userId),
      name: location.name,
      ...(location.latitude !== undefined && { latitude: location.latitude }),
      ...(location.longitude !== undefined && {
        longitude: location.longitude
      }),
      ...(location.canvasWidth !== undefined && {
        canvasWidth: location.canvasWidth
      }),
      ...(location.canvasHeight !== undefined && {
        canvasHeight: location.canvasHeight
      }),
      ...(location.northAngle !== undefined && {
        northAngle: location.northAngle
      }),
      status: location.status,
      ...(location.deletedAt && {
        deletedAt: location.deletedAt.toISOString()
      }),
      metadata: location.metadata.toPrimitives(),
      version: location.version
    };
  }
};
