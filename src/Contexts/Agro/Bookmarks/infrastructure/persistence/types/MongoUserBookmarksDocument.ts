import type { Binary, UUID } from 'mongodb';
import type { MetadataPrimitives } from '../../../../../shared/domain/MetadataPrimitives.js';

export type MongoFavoritePlantItemDocument = {
  plantId: Binary | UUID | string;
  bookmarkedAt: Date | string;
};

export type MongoUserBookmarksDocument = {
  _id: Binary | UUID | string;
  userId: Binary | UUID | string;
  plants: MongoFavoritePlantItemDocument[];
  metadata: MetadataPrimitives;
  version: number;
};
