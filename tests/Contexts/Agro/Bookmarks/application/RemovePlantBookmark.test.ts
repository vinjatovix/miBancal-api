import { RemovePlantBookmark } from '../../../../../src/Contexts/Agro/Bookmarks/application/useCases/RemovePlantBookmark.js';
import { UserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import type { UserBookmarksRepository } from '../../../../../src/Contexts/Agro/Bookmarks/domain/repositories/interfaces/UserBookmarksRepository.js';
import { createUserBookmarksId } from '../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

describe('RemovePlantBookmark', () => {
  const userIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c1';
  const plantIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';
  const bookmarksId = createUserBookmarksId(
    '6ba7b810-9dad-11d1-80b4-00c04fd430c0'
  );
  const userId = createUserId(userIdStr);
  const plantId = createPlantId(plantIdStr);
  const user: UserSessionInfo = {
    id: userIdStr,
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const buildMocks = () => {
    const updateWithDiffMock = jest.fn().mockResolvedValue('written');
    const findByUserIdMock = jest.fn();
    const saveMock = jest.fn().mockResolvedValue(undefined);
    const findByIdMock = jest.fn();

    const userBookmarksRepository: UserBookmarksRepository = {
      findById: findByIdMock,
      findByUserId: findByUserIdMock,
      save: saveMock,
      updateWithDiff: updateWithDiffMock
    };

    return { userBookmarksRepository, updateWithDiffMock, findByUserIdMock };
  };

  it('removes plant from aggregate and updates via diff', async () => {
    const { userBookmarksRepository, updateWithDiffMock, findByUserIdMock } =
      buildMocks();
    const existingAggregate = new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [
        new FavoritePlantItem(plantId, new Date('2026-10-22T10:00:00.000Z'))
      ],
      metadata: Metadata.create(
        'previousEditor',
        new Date('2026-10-22T10:00:00.000Z')
      ),
      version: 0
    });
    findByUserIdMock.mockResolvedValueOnce(existingAggregate);
    const useCase = new RemovePlantBookmark({ userBookmarksRepository });

    await useCase.execute(plantIdStr, user);

    expect(updateWithDiffMock).toHaveBeenCalledWith(
      expect.objectContaining({
        plants: [expect.objectContaining({ plantId: plantIdStr })]
      }),
      expect.objectContaining({
        plants: []
      })
    );
    expect(existingAggregate.hasPlant(plantId)).toBe(false);
    expect(existingAggregate.metadata.createdBy).toBe('previousEditor');
    expect(existingAggregate.metadata.updatedBy).toBe(user.username);
  });

  it('completes idempotently when plant is not bookmarked', async () => {
    const { userBookmarksRepository, updateWithDiffMock, findByUserIdMock } =
      buildMocks();
    const existingAggregate = new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [],
      metadata: Metadata.create(
        userIdStr,
        new Date('2026-10-22T10:00:00.000Z')
      ),
      version: 0
    });
    findByUserIdMock.mockResolvedValueOnce(existingAggregate);
    const useCase = new RemovePlantBookmark({ userBookmarksRepository });

    await useCase.execute(plantIdStr, user);

    expect(updateWithDiffMock).not.toHaveBeenCalled();
  });

  it('completes idempotently when user has no bookmarks aggregate', async () => {
    const { userBookmarksRepository, updateWithDiffMock, findByUserIdMock } =
      buildMocks();
    findByUserIdMock.mockResolvedValueOnce(null);
    const useCase = new RemovePlantBookmark({ userBookmarksRepository });

    await useCase.execute(plantIdStr, user);

    expect(updateWithDiffMock).not.toHaveBeenCalled();
  });
});
