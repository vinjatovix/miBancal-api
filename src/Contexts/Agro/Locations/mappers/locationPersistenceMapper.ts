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
      ...(document.postalCode !== undefined && {
        postalCode: document.postalCode
      }),
      ...(document.country !== undefined && { country: document.country }),
      ...(document.timezone !== undefined && {
        timezone: document.timezone
      }),
      ...(document.hemisphere !== undefined && {
        hemisphere: document.hemisphere
      }),
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
      ...(location.postalCode !== undefined && {
        postalCode: location.postalCode
      }),
      ...(location.country !== undefined && { country: location.country }),
      ...(location.timezone !== undefined && {
        timezone: location.timezone
      }),
      ...(location.hemisphere !== undefined && {
        hemisphere: location.hemisphere
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
