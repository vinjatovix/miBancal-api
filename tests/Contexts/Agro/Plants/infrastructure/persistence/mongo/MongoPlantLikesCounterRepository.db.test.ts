import { asClass } from 'awilix';
import type { Binary, Db } from 'mongodb';
import type { PlantLikesCounterRepository } from '../../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import { MongoPlantLikesCounterRepository } from '../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantLikesCounterRepository.js';
import { toMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { random } from '../../../../../shared/fixtures/random.js';

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

  const insertPlantWithId = async (
    id: string,
    likesCount?: number
  ): Promise<void> => {
    const document: { _id: string | Binary; likesCount?: number } = {
      _id: toMongoId(id)
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

  describe('getLikesCount', () => {
    it.each([
      {
        scenario: 'returns stored likesCount when present',
        seedCount: 7,
        expected: 7
      },
      {
        scenario: 'returns zero when likesCount field does not exist',
        seedCount: undefined,
        expected: 0
      }
    ])('$scenario', async ({ seedCount, expected }) => {
      await insertPlant(seedCount);

      const count = await repository.getLikesCount(plantId);

      expect(count).toBe(expected);
    });

    it('returns zero for a plant that does not exist in storage', async () => {
      const nonExistentPlantId = random.uuid();

      const count = await repository.getLikesCount(nonExistentPlantId);

      expect(count).toBe(0);
    });
  });

  describe('getLikesCounts', () => {
    it('returns counts mapped by plant id for multiple existing plants', async () => {
      const firstId = random.uuid();
      const secondId = random.uuid();
      await insertPlantWithId(firstId, 5);
      await insertPlantWithId(secondId, 12);

      const counts = await repository.getLikesCounts([firstId, secondId]);

      expect(counts.get(firstId)).toBe(5);
      expect(counts.get(secondId)).toBe(12);
    });

    it('returns zero for missing documents or plants without likesCount field', async () => {
      const existingWithoutLikes = random.uuid();
      const nonExistentId = random.uuid();
      await insertPlantWithId(existingWithoutLikes);

      const counts = await repository.getLikesCounts([
        existingWithoutLikes,
        nonExistentId
      ]);

      expect(counts.get(existingWithoutLikes)).toBe(0);
      expect(counts.get(nonExistentId)).toBeUndefined();
    });

    it.each([
      {
        scenario: 'empty input array',
        ids: [] as string[]
      },
      {
        scenario: 'input array with invalid UUIDs only',
        ids: ['not-a-uuid', 'invalid']
      }
    ])('returns an empty map for $scenario', async ({ ids }) => {
      const counts = await repository.getLikesCounts(ids);

      expect(counts.size).toBe(0);
    });
  });
});
