import type { Binary, UUID } from 'mongodb';

export type MongoPlantLikeDocument = {
  _id: Binary | UUID | string;
  userId: Binary | UUID | string;
  plantId: Binary | UUID | string;
  likedAt: Date;
};
