import { CheckPlantBookmark } from '../../../../../src/Contexts/Agro/Bookmarks/application/useCases/CheckPlantBookmark.js';
import { UserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import type { UserBookmarksRepository } from '../../../../../src/Contexts/Agro/Bookmarks/domain/repositories/interfaces/UserBookmarksRepository.js';
import { createUserBookmarksId } from '../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

describe('CheckPlantBookmark', () => {
  const userIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c1';
  const plantId1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';
  const plantId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c3';
  const bookmarksId = createUserBookmarksId(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c0'
  );
  const userId = createUserId(userIdStr);
  const user: UserSessionInfo = {
    id: userIdStr,
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const buildMocks = () => {
    const userBookmarksRepository: jest.Mocked<UserBookmarksRepository> = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
      updateWithDiff: jest.fn()
    };

    return { userBookmarksRepository };
  };

  it('returns bookmarked false when user has no bookmarks aggregate', async () => {
    const { userBookmarksRepository } = buildMocks();
    userBookmarksRepository.findByUserId.mockResolvedValueOnce(null);
    const useCase = new CheckPlantBookmark({ userBookmarksRepository });

    const result = await useCase.execute(plantId1, user);

    expect(result).toEqual({ bookmarked: false });
  });

  it('returns bookmarked false when plant is not bookmarked', async () => {
    const { userBookmarksRepository } = buildMocks();
    const date = new Date('2026-10-22T10:00:00.000Z');
    const existingAggregate = new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [new FavoritePlantItem(createPlantId(plantId1), date)],
      metadata: Metadata.create(userIdStr, date),
      version: 0
    });
    userBookmarksRepository.findByUserId.mockResolvedValueOnce(
      existingAggregate
    );
    const useCase = new CheckPlantBookmark({ userBookmarksRepository });

    const result = await useCase.execute(plantId2, user);

    expect(result).toEqual({ bookmarked: false });
  });

  it('returns bookmarked true with bookmarkedAt timestamp when plant is bookmarked', async () => {
    const { userBookmarksRepository } = buildMocks();
    const date = new Date('2026-10-22T10:00:00.000Z');
    const existingAggregate = new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [new FavoritePlantItem(createPlantId(plantId1), date)],
      metadata: Metadata.create(userIdStr, date),
      version: 0
    });
    userBookmarksRepository.findByUserId.mockResolvedValueOnce(
      existingAggregate
    );
    const useCase = new CheckPlantBookmark({ userBookmarksRepository });

    const result = await useCase.execute(plantId1, user);

    expect(result).toEqual({
      bookmarked: true,
      bookmarkedAt: date.toISOString()
    });
  });
});
