import { asClass } from 'awilix';
import type { Binary, Db } from 'mongodb';
import type { PlantLikesCounterRepository } from '../../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import { MongoPlantLikesCounterRepository } from '../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantLikesCounterRepository.js';
import { toMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';

describe('MongoPlantLikesCounterRepository (integration)', () => {
  let context: DbTestContext;
  let db: Db;
  let repository: PlantLikesCounterRepository;

  const plantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';

  const insertPlant = async (likesCount?: number): Promise<void> => {
    const document: { _id: string | Binary; likesCount?: number } = {
      _id: toMongoId(plantId)
    };
    if (likesCount !== undefined) {
      document.likesCount = likesCount;
    }
    await db
      .collection<{ _id: string | Binary; likesCount?: number }>('plants')
      .insertOne(document);
  };

  const storedLikesCount = async (): Promise<number | undefined> => {
    const plant = await db
      .collection<{ _id: string | Binary; likesCount?: number }>('plants')
      .findOne({ _id: toMongoId(plantId) });

    return plant?.likesCount;
  };

  beforeAll(async () => {
    context = await createDbTestContext({
      plantLikesCounterRepository: asClass(
        MongoPlantLikesCounterRepository
      ).singleton()
    });
    db = context.db;
    repository = context.container.resolve<PlantLikesCounterRepository>(
      'plantLikesCounterRepository'
    );
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('increment', () => {
    it('increases likesCount by one on an existing plant', async () => {
      await insertPlant(0);

      await repository.increment(plantId);

      expect(await storedLikesCount()).toBe(1);
    });

    it('initializes likesCount to one on a plant without the field', async () => {
      await insertPlant();

      await repository.increment(plantId);

      expect(await storedLikesCount()).toBe(1);
    });
  });

  describe('decrement', () => {
    it('decreases likesCount by one on a plant with likes', async () => {
      await insertPlant(2);

      await repository.decrement(plantId);

      expect(await storedLikesCount()).toBe(1);
    });

    it('never drives likesCount below zero when counter is already zero', async () => {
      await insertPlant(0);

      await repository.decrement(plantId);

      expect(await storedLikesCount()).toBe(0);
    });

    it('leaves document unchanged when likesCount field does not exist', async () => {
      await insertPlant();

      await repository.decrement(plantId);

      expect(await storedLikesCount()).toBeUndefined();
    });
  });
});
