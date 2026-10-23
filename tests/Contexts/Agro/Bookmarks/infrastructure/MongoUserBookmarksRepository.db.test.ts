import { asClass } from 'awilix';
import type { Db } from 'mongodb';
import { up } from '../../../../../migrations/scripts/20261023120000-create-user-bookmarks-collection.js';
import { UserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import type { UserBookmarksRepository } from '../../../../../src/Contexts/Agro/Bookmarks/domain/repositories/interfaces/UserBookmarksRepository.js';
import {
  createUserBookmarksId,
  randomUserBookmarksId
} from '../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import { MongoUserBookmarksRepository } from '../../../../../src/Contexts/Agro/Bookmarks/infrastructure/persistence/MongoUserBookmarksRepository.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import {
  createUserId,
  randomUserId
} from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainConflictException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';

let context: DbTestContext;
let repository: UserBookmarksRepository;
let db: Db;

describe('MongoUserBookmarksRepository (integration)', () => {
  beforeAll(async () => {
    context = await createDbTestContext({
      userBookmarksRepository: asClass(MongoUserBookmarksRepository).singleton()
    });
    db = context.db;

    await up(db);

    repository = context.container.resolve<UserBookmarksRepository>(
      'userBookmarksRepository'
    );
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  const buildAggregate = (
    userIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    bookmarksIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c0'
  ) => {
    const bookmarksId = createUserBookmarksId(bookmarksIdStr);
    const userId = createUserId(userIdStr);
    const plantId = createPlantId('6ba7b810-9dad-11d1-80b4-00c04fd430c2');
    const date = new Date('2026-10-22T14:30:00.000Z');

    return new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [new FavoritePlantItem(plantId, date)],
      metadata: Metadata.create(userId, date),
      version: 0
    });
  };

  it('saves and finds aggregate by id', async () => {
    const aggregate = buildAggregate();

    await repository.save(aggregate);
    const found = await repository.findById(aggregate.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(aggregate.id);
    expect(found?.userId).toBe(aggregate.userId);
    expect(found?.plants).toHaveLength(1);
    expect(found?.plants[0]?.plantId).toBe(aggregate.plants[0]?.plantId);
  });

  it('returns null when aggregate is not found by id', async () => {
    const found = await repository.findById(randomUserBookmarksId());

    expect(found).toBeNull();
  });

  it('finds aggregate by userId', async () => {
    const aggregate = buildAggregate();

    await repository.save(aggregate);
    const found = await repository.findByUserId(aggregate.userId);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(aggregate.id);
    expect(found?.userId).toBe(aggregate.userId);
  });

  it('returns null when aggregate is not found by userId', async () => {
    const found = await repository.findByUserId(randomUserId());

    expect(found).toBeNull();
  });

  it('enforces unique index constraint on userId across aggregates', async () => {
    const aggregate1 = buildAggregate(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c0'
    );
    const aggregate2 = buildAggregate(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
      '7ba7b810-9dad-11d1-80b4-00c04fd430c9'
    );

    await repository.save(aggregate1);
    const saveDuplicate = repository.save(aggregate2);

    await expect(saveDuplicate).rejects.toThrow(DomainConflictException);
  });

  it('updates aggregate with diff and increments version in real MongoDB', async () => {
    const aggregate = buildAggregate();
    await repository.save(aggregate);
    const before = aggregate.toPrimitives();
    const newPlantId = createPlantId('6ba7b810-9dad-11d1-80b4-00c04fd430c3');
    aggregate.addPlant(
      newPlantId,
      'bookmarker',
      new Date('2026-10-22T15:00:00.000Z')
    );
    const after = aggregate.toPrimitives();

    const outcome = await repository.updateWithDiff(before, after);
    const reloaded = await repository.findById(aggregate.id);

    expect(outcome).toBe('written');
    expect(reloaded?.version).toBe(1);
    expect(reloaded?.plants).toHaveLength(2);
    expect(reloaded?.hasPlant(newPlantId)).toBe(true);
  });

  it('returns unchanged when updating with identical state', async () => {
    const aggregate = buildAggregate();
    await repository.save(aggregate);
    const state = aggregate.toPrimitives();

    const outcome = await repository.updateWithDiff(state, state);
    const reloaded = await repository.findById(aggregate.id);

    expect(outcome).toBe('unchanged');
    expect(reloaded?.version).toBe(0);
  });
});
