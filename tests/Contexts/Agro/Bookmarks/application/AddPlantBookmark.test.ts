import { AddPlantBookmark } from '../../../../../src/Contexts/Agro/Bookmarks/application/useCases/AddPlantBookmark.js';
import { UserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import type { UserBookmarksRepository } from '../../../../../src/Contexts/Agro/Bookmarks/domain/repositories/interfaces/UserBookmarksRepository.js';
import { createUserBookmarksId } from '../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import type { Plant } from '../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

describe('AddPlantBookmark', () => {
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

  const mockActivePlant = {
    id: plantId
  } as unknown as Plant;

  const buildMocks = () => {
    const saveMock: jest.MockedFunction<UserBookmarksRepository['save']> = jest
      .fn()
      .mockResolvedValue(undefined);
    const updateWithDiffMock = jest.fn().mockResolvedValue('written');
    const findByUserIdMock = jest.fn();
    const findByIdMock = jest.fn();

    const userBookmarksRepository: UserBookmarksRepository = {
      findById: findByIdMock,
      findByUserId: findByUserIdMock,
      save: saveMock,
      updateWithDiff: updateWithDiffMock
    };

    const findActiveByIdMock = jest.fn();
    const plantRepository = {
      findActiveById: findActiveByIdMock
    } as unknown as PlantRepository;

    return {
      userBookmarksRepository,
      plantRepository,
      saveMock,
      updateWithDiffMock,
      findByUserIdMock,
      findActiveByIdMock
    };
  };

  it('creates aggregate and saves when user has no existing bookmarks', async () => {
    const {
      userBookmarksRepository,
      plantRepository,
      saveMock,
      updateWithDiffMock,
      findByUserIdMock,
      findActiveByIdMock
    } = buildMocks();
    findActiveByIdMock.mockResolvedValueOnce(mockActivePlant);
    findByUserIdMock.mockResolvedValueOnce(null);
    const useCase = new AddPlantBookmark({
      userBookmarksRepository,
      plantRepository
    });

    const result = await useCase.execute({ plantId: plantIdStr }, user);

    expect(result.status).toBe(201);
    expect(result.item.plantId).toBe(plantIdStr);
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId
      })
    );
    const savedAggregate = saveMock.mock.calls[0]?.[0];
    expect(savedAggregate?.hasPlant(plantId)).toBe(true);
    expect(savedAggregate?.metadata.createdBy).toBe(user.username);
    expect(savedAggregate?.metadata.updatedBy).toBe(user.username);
    expect(updateWithDiffMock).not.toHaveBeenCalled();
  });

  it('updates via diff when user already has an aggregate', async () => {
    const {
      userBookmarksRepository,
      plantRepository,
      saveMock,
      updateWithDiffMock,
      findByUserIdMock,
      findActiveByIdMock
    } = buildMocks();
    findActiveByIdMock.mockResolvedValueOnce(mockActivePlant);
    const existingAggregate = new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [],
      metadata: Metadata.create(
        'previousEditor',
        new Date('2026-10-22T10:00:00.000Z')
      ),
      version: 0
    });
    findByUserIdMock.mockResolvedValueOnce(existingAggregate);
    const useCase = new AddPlantBookmark({
      userBookmarksRepository,
      plantRepository
    });

    const result = await useCase.execute({ plantId: plantIdStr }, user);

    expect(result.status).toBe(201);
    expect(result.item.plantId).toBe(plantIdStr);
    expect(existingAggregate.metadata.createdBy).toBe('previousEditor');
    expect(existingAggregate.metadata.updatedBy).toBe(user.username);
    expect(updateWithDiffMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: bookmarksId,
        userId: userIdStr,
        plants: []
      }),
      expect.objectContaining({
        id: bookmarksId,
        userId: userIdStr,
        plants: [
          expect.objectContaining({
            plantId: plantIdStr
          })
        ]
      })
    );
    expect(saveMock).not.toHaveBeenCalled();
  });

  it('returns status 200 and preserves existing bookmark on duplicate addition', async () => {
    const {
      userBookmarksRepository,
      plantRepository,
      saveMock,
      updateWithDiffMock,
      findByUserIdMock,
      findActiveByIdMock
    } = buildMocks();
    findActiveByIdMock.mockResolvedValueOnce(mockActivePlant);
    const existingDate = new Date('2026-10-22T08:00:00.000Z');
    const existingAggregate = new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [new FavoritePlantItem(plantId, existingDate)],
      metadata: Metadata.create(userIdStr, existingDate),
      version: 1
    });
    findByUserIdMock.mockResolvedValueOnce(existingAggregate);
    const useCase = new AddPlantBookmark({
      userBookmarksRepository,
      plantRepository
    });

    const result = await useCase.execute({ plantId: plantIdStr }, user);

    expect(result.status).toBe(200);
    expect(result.item.plantId).toBe(plantIdStr);
    expect(result.item.bookmarkedAt).toBe(existingDate.toISOString());
    expect(saveMock).not.toHaveBeenCalled();
    expect(updateWithDiffMock).not.toHaveBeenCalled();
  });

  it('throws DomainNotFoundException when plant is not found in catalog', async () => {
    const { userBookmarksRepository, plantRepository, findActiveByIdMock } =
      buildMocks();
    findActiveByIdMock.mockResolvedValueOnce(null);
    const useCase = new AddPlantBookmark({
      userBookmarksRepository,
      plantRepository
    });

    const action = useCase.execute({ plantId: plantIdStr }, user);

    await expect(action).rejects.toThrow(DomainNotFoundException);
  });
});
