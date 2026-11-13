import { asClass } from 'awilix';
import type { Db } from 'mongodb';
import { up } from '../../../../../migrations/scripts/20261023130000-create-plant-likes-collection.js';
import type { PlantLikeRepository } from '../../../../../src/Contexts/Agro/PlantLikes/domain/repositories/interfaces/PlantLikeRepository.js';
import { MongoPlantLikeRepository } from '../../../../../src/Contexts/Agro/PlantLikes/infrastructure/persistence/MongoPlantLikeRepository.js';
import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { PlantLikeMother } from '../domain/PlantLikeMother.js';

describe('MongoPlantLikeRepository (integration)', () => {
  let context: DbTestContext;
  let db: Db;
  let likeRepository: PlantLikeRepository;

  const plantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';
  const userId = '6ba7b810-9dad-11d1-80b4-00c04fd430c1';
  const otherUserId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  beforeAll(async () => {
    context = await createDbTestContext({
      plantLikeRepository: asClass(MongoPlantLikeRepository).singleton()
    });
    db = context.db;

    await up(db);

    likeRepository = context.container.resolve<PlantLikeRepository>(
      'plantLikeRepository'
    );
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('add', () => {
    it('returns true and inserts document on a first like', async () => {
      const like = PlantLikeMother.of(userId, plantId);

      const created = await likeRepository.add(like);

      expect(created).toBe(true);
      const count = await db.collection('plant_likes').countDocuments({
        userId: toMongoId(userId),
        plantId: toMongoId(plantId)
      });
      expect(count).toBe(1);
    });

    it('returns false and does not create duplicate on a repeat like', async () => {
      const firstLike = PlantLikeMother.of(userId, plantId);
      const secondLike = PlantLikeMother.of(userId, plantId);
      await likeRepository.add(firstLike);

      const created = await likeRepository.add(secondLike);

      expect(created).toBe(false);
      const count = await db.collection('plant_likes').countDocuments({
        userId: toMongoId(userId),
        plantId: toMongoId(plantId)
      });
      expect(count).toBe(1);
    });
  });

  describe('find', () => {
    it('returns the persisted like when present', async () => {
      const like = PlantLikeMother.of(userId, plantId);
      await likeRepository.add(like);

      const found = await likeRepository.find(userId, plantId);

      expect(found).not.toBeNull();
      expect(found?.userId).toBe(userId);
      expect(found?.plantId).toBe(plantId);
    });

    it('returns null when no like matches', async () => {
      const found = await likeRepository.find(userId, plantId);

      expect(found).toBeNull();
    });
  });

  describe('remove', () => {
    it('returns true and deletes the document when like exists', async () => {
      const like = PlantLikeMother.of(userId, plantId);
      await likeRepository.add(like);

      const removed = await likeRepository.remove(userId, plantId);

      expect(removed).toBe(true);
      const found = await likeRepository.find(userId, plantId);
      expect(found).toBeNull();
    });

    it('returns false when no like was stored', async () => {
      const removed = await likeRepository.remove(userId, plantId);

      expect(removed).toBe(false);
    });
  });

  describe('concurrency', () => {
    it('stores distinct likes when different users like the same plant concurrently', async () => {
      const userLike = PlantLikeMother.of(userId, plantId);
      const otherUserLike = PlantLikeMother.of(otherUserId, plantId);

      await Promise.all([
        likeRepository.add(userLike),
        likeRepository.add(otherUserLike)
      ]);

      const count = await db.collection('plant_likes').countDocuments({
        plantId: toMongoId(plantId)
      });
      expect(count).toBe(2);
    });
  });
});
