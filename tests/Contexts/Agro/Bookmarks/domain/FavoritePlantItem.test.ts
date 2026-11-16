import { FavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';

describe('FavoritePlantItem', () => {
  const validPlantId = createPlantId('6ba7b810-9dad-11d1-80b4-00c04fd430c8');
  const validDate = new Date('2026-10-22T14:30:00.000Z');

  it('instantiates successfully with valid plantId and date', () => {
    const item = new FavoritePlantItem(validPlantId, validDate);

    expect(item.plantId).toBe(validPlantId);
    expect(item.bookmarkedAt).toEqual(validDate);
  });

  it('throws InvalidArgumentException when plantId is empty', () => {
    const emptyPlantId = '' as unknown as typeof validPlantId;

    const action = () => new FavoritePlantItem(emptyPlantId, validDate);

    expect(action).toThrow(InvalidArgumentException);
  });

  it('throws InvalidArgumentException when bookmarkedAt is invalid date', () => {
    const invalidDate = new Date('invalid-date');

    const action = () => new FavoritePlantItem(validPlantId, invalidDate);

    expect(action).toThrow(InvalidArgumentException);
  });

  it('equals returns true when plantIds match regardless of timestamp', () => {
    const item1 = new FavoritePlantItem(
      validPlantId,
      new Date('2026-10-22T10:00:00.000Z')
    );
    const item2 = new FavoritePlantItem(
      validPlantId,
      new Date('2026-10-22T18:00:00.000Z')
    );

    const result = item1.equals(item2);

    expect(result).toBe(true);
  });

  it('equals returns false when plantIds differ', () => {
    const anotherPlantId = createPlantId(
      '7ba7b810-9dad-11d1-80b4-00c04fd430c9'
    );
    const item1 = new FavoritePlantItem(validPlantId, validDate);
    const item2 = new FavoritePlantItem(anotherPlantId, validDate);

    const result = item1.equals(item2);

    expect(result).toBe(false);
  });

  it('serializes to primitives with ISO timestamp string', () => {
    const item = new FavoritePlantItem(validPlantId, validDate);

    const primitives = item.toPrimitives();

    expect(primitives).toEqual({
      plantId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      bookmarkedAt: '2026-10-22T14:30:00.000Z'
    });
  });

  it('reconstitutes instance from primitives', () => {
    const primitives = {
      plantId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      bookmarkedAt: '2026-10-22T14:30:00.000Z'
    };

    const item = FavoritePlantItem.fromPrimitives(primitives);

    expect(item.plantId).toBe(validPlantId);
    expect(item.bookmarkedAt).toEqual(validDate);
  });
});
