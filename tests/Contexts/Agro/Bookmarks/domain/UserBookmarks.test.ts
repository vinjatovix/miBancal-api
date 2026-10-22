import { UserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import { createUserBookmarksId } from '../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

describe('UserBookmarks', () => {
  const bookmarksId = createUserBookmarksId(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c0'
  );
  const userId = createUserId('6ba7b810-9dad-11d1-80b4-00c04fd430c1');
  const plantId1 = createPlantId('6ba7b810-9dad-11d1-80b4-00c04fd430c2');
  const plantId2 = createPlantId('6ba7b810-9dad-11d1-80b4-00c04fd430c3');
  const initialDate = new Date('2026-10-22T10:00:00.000Z');

  const buildAggregate = (plants: FavoritePlantItem[] = []) =>
    new UserBookmarks({
      id: bookmarksId,
      userId,
      plants,
      metadata: Metadata.create(userId, initialDate),
      version: 0
    });

  it('creates empty aggregate root using create factory', () => {
    const aggregate = UserBookmarks.create(
      bookmarksId,
      userId,
      userId,
      initialDate
    );

    expect(aggregate.id).toBe(bookmarksId);
    expect(aggregate.userId).toBe(userId);
    expect(aggregate.plants).toHaveLength(0);
    expect(aggregate.version).toBe(0);
  });

  it('adds a plant item and updates metadata timestamp', () => {
    const aggregate = buildAggregate();
    const addedAt = new Date('2026-10-22T12:00:00.000Z');

    const added = aggregate.addPlant(plantId1, addedAt);

    expect(added).toBe(true);
    expect(aggregate.hasPlant(plantId1)).toBe(true);
    expect(aggregate.plants).toHaveLength(1);
    expect(aggregate.metadata.updatedAt).toEqual(addedAt);
  });

  it('returns false and preserves existing timestamp on duplicate addPlant', () => {
    const aggregate = buildAggregate();
    const firstAddDate = new Date('2026-10-22T12:00:00.000Z');
    const secondAddDate = new Date('2026-10-22T14:00:00.000Z');
    aggregate.addPlant(plantId1, firstAddDate);

    const duplicateAdded = aggregate.addPlant(plantId1, secondAddDate);

    expect(duplicateAdded).toBe(false);
    expect(aggregate.plants).toHaveLength(1);
    expect(aggregate.getPlantBookmark(plantId1)?.bookmarkedAt).toEqual(
      firstAddDate
    );
  });

  it('hasPlant returns true when plant exists in bookmarks', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);

    const exists = aggregate.hasPlant(plantId1);

    expect(exists).toBe(true);
  });

  it('hasPlant returns false when plant does not exist in bookmarks', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);

    const exists = aggregate.hasPlant(plantId2);

    expect(exists).toBe(false);
  });

  it('getPlantBookmark returns item when plant is present in bookmarks', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);

    const item = aggregate.getPlantBookmark(plantId1);

    expect(item?.plantId).toBe(plantId1);
  });

  it('getPlantBookmark returns null when plant is missing from bookmarks', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);

    const item = aggregate.getPlantBookmark(plantId2);

    expect(item).toBeNull();
  });

  it('removes an existing plant item and updates metadata timestamp', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);
    const removedAt = new Date('2026-10-22T15:00:00.000Z');

    const removed = aggregate.removePlant(plantId1, removedAt);

    expect(removed).toBe(true);
    expect(aggregate.hasPlant(plantId1)).toBe(false);
    expect(aggregate.plants).toHaveLength(0);
    expect(aggregate.metadata.updatedAt).toEqual(removedAt);
  });

  it('returns false when removePlant is called for unbookmarked plant', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);

    const removed = aggregate.removePlant(plantId2);

    expect(removed).toBe(false);
    expect(aggregate.plants).toHaveLength(1);
  });

  it('leaves clean empty array when removing last item', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);

    aggregate.removePlant(plantId1);

    expect(aggregate.plants).toEqual([]);
  });

  it('plantBookmarks returns collection of favorite items', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);

    const bookmarks = aggregate.plantBookmarks();

    expect(bookmarks).toHaveLength(1);
  });

  it('serializes to and restores from primitives accurately', () => {
    const aggregate = buildAggregate();
    aggregate.addPlant(plantId1, initialDate);

    const primitives = aggregate.toPrimitives();
    const restored = UserBookmarks.fromPrimitives(primitives);

    expect(restored.toPrimitives()).toEqual(primitives);
  });

  it('throws InvalidArgumentException on duplicate plants in props', () => {
    const duplicatePlants = [
      new FavoritePlantItem(plantId1, initialDate),
      new FavoritePlantItem(plantId1, initialDate)
    ];

    const action = () =>
      new UserBookmarks({
        id: bookmarksId,
        userId,
        plants: duplicatePlants,
        metadata: Metadata.create(userId, initialDate),
        version: 0
      });

    expect(action).toThrow(InvalidArgumentException);
  });

  it('throws InvalidArgumentException when id is missing from props', () => {
    const action = () =>
      new UserBookmarks({
        id: '' as unknown as typeof bookmarksId,
        userId,
        plants: [],
        metadata: Metadata.create(userId, initialDate),
        version: 0
      });

    expect(action).toThrow(InvalidArgumentException);
  });

  it('throws InvalidArgumentException when userId is missing from props', () => {
    const action = () =>
      new UserBookmarks({
        id: bookmarksId,
        userId: '' as unknown as typeof userId,
        plants: [],
        metadata: Metadata.create(userId, initialDate),
        version: 0
      });

    expect(action).toThrow(InvalidArgumentException);
  });
});
