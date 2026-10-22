import type { EnrichedFavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/application/dtos/index.js';
import { GetUserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/application/useCases/GetUserBookmarks.js';
import { UserBookmarks } from '../../../../../src/Contexts/Agro/Bookmarks/domain/entities/UserBookmarks.js';
import type { UserBookmarksRepository } from '../../../../../src/Contexts/Agro/Bookmarks/domain/repositories/interfaces/UserBookmarksRepository.js';
import { createUserBookmarksId } from '../../../../../src/Contexts/Agro/Bookmarks/domain/UserBookmarksId.js';
import { FavoritePlantItem } from '../../../../../src/Contexts/Agro/Bookmarks/domain/value-objects/FavoritePlantItem.js';
import { createFamilyId } from '../../../../../src/Contexts/Agro/Families/domain/FamilyId.js';
import type { FamilySummaryReader } from '../../../../../src/Contexts/Agro/Plants/application/queries/FamilySummaryReader.js';
import type { Plant } from '../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { PlantStatus } from '../../../../../src/Contexts/Agro/Plants/domain/entities/types/index.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/interfaces/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { Metadata } from '../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

describe('GetUserBookmarks', () => {
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
    email: 'farmer@example.com',
    roles: ['user']
  };

  const buildMockPlant = (
    id: string,
    primaryName: string,
    scientificName: string,
    familyId: string,
    status: PlantStatus = PlantStatus.ACTIVE,
    deletedAt?: Date
  ): Plant =>
    ({
      id: createPlantId(id),
      identity: {
        name: { primary: primaryName },
        scientificName,
        family: createFamilyId(familyId)
      },
      knowledge: {
        primaryImage: () => ({
          url: `https://example.com/${primaryName.toLowerCase()}.jpg`,
          title: primaryName,
          source: 'Wikimedia'
        })
      },
      status,
      deletedAt
    }) as unknown as Plant;

  const buildMocks = () => {
    const userBookmarksRepository: jest.Mocked<UserBookmarksRepository> = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
      updateWithDiff: jest.fn()
    };

    const plantRepository: jest.Mocked<PlantRepository> = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      findActiveById: jest.fn(),
      save: jest.fn(),
      updateWithDiff: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn()
    };

    const familySummaryReader: jest.Mocked<FamilySummaryReader> = {
      findSummariesByIds: jest.fn()
    };

    return { userBookmarksRepository, plantRepository, familySummaryReader };
  };

  it('returns empty plants array when user has no bookmarks aggregate', async () => {
    const { userBookmarksRepository, plantRepository, familySummaryReader } =
      buildMocks();
    userBookmarksRepository.findByUserId.mockResolvedValueOnce(null);
    const useCase = new GetUserBookmarks({
      userBookmarksRepository,
      plantRepository,
      familySummaryReader
    });

    const result = await useCase.execute({}, user);

    expect(result).toEqual({ plants: [] });
  });

  it('returns lightweight bookmark list when include is not specified', async () => {
    const { userBookmarksRepository, plantRepository, familySummaryReader } =
      buildMocks();
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
    const useCase = new GetUserBookmarks({
      userBookmarksRepository,
      plantRepository,
      familySummaryReader
    });

    const result = await useCase.execute({}, user);

    expect(result).toEqual({
      plants: [{ plantId: plantId1, bookmarkedAt: date.toISOString() }]
    });
  });

  it('returns enriched plant summaries sorted alphabetically by plant name when include is plant', async () => {
    const { userBookmarksRepository, plantRepository, familySummaryReader } =
      buildMocks();
    const date1 = new Date('2026-10-22T10:00:00.000Z');
    const date2 = new Date('2026-10-22T11:00:00.000Z');
    const existingAggregate = new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [
        new FavoritePlantItem(createPlantId(plantId1), date1),
        new FavoritePlantItem(createPlantId(plantId2), date2)
      ],
      metadata: Metadata.create(userIdStr, date1),
      version: 0
    });
    userBookmarksRepository.findByUserId.mockResolvedValueOnce(
      existingAggregate
    );
    const plantZ = buildMockPlant(
      plantId1,
      'Zanahoria',
      'Daucus carota',
      '6ba7b810-9dad-11d1-80b4-00c04fd430e1'
    );
    const plantA = buildMockPlant(
      plantId2,
      'Ajo',
      'Allium sativum',
      '6ba7b810-9dad-11d1-80b4-00c04fd430e2'
    );
    plantRepository.findByIds.mockResolvedValueOnce([plantZ, plantA]);
    familySummaryReader.findSummariesByIds.mockResolvedValueOnce([
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430e1',
        name: 'Apiaceae',
        slug: 'apiaceae'
      },
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430e2',
        name: 'Amaryllidaceae',
        slug: 'amaryllidaceae'
      }
    ]);
    const useCase = new GetUserBookmarks({
      userBookmarksRepository,
      plantRepository,
      familySummaryReader
    });

    const result = await useCase.execute({ include: 'plant' }, user);

    expect(result.plants).toHaveLength(2);
    const enrichedList = result.plants as EnrichedFavoritePlantItem[];
    expect(enrichedList[0]?.plant.name).toBe('Ajo');
    expect(enrichedList[1]?.plant.name).toBe('Zanahoria');
    expect(enrichedList[0]?.plant.family.name).toBe('Amaryllidaceae');
  });

  it('filters out inactive or deleted catalog plants from enriched response', async () => {
    const { userBookmarksRepository, plantRepository, familySummaryReader } =
      buildMocks();
    const date = new Date('2026-10-22T10:00:00.000Z');
    const existingAggregate = new UserBookmarks({
      id: bookmarksId,
      userId,
      plants: [
        new FavoritePlantItem(createPlantId(plantId1), date),
        new FavoritePlantItem(createPlantId(plantId2), date)
      ],
      metadata: Metadata.create(userIdStr, date),
      version: 0
    });
    userBookmarksRepository.findByUserId.mockResolvedValueOnce(
      existingAggregate
    );
    const activePlant = buildMockPlant(
      plantId1,
      'Tomate',
      'Solanum lycopersicum',
      '6ba7b810-9dad-11d1-80b4-00c04fd430e3'
    );
    const deletedPlant = buildMockPlant(
      plantId2,
      'Berenjena',
      'Solanum melongena',
      '6ba7b810-9dad-11d1-80b4-00c04fd430e3',
      PlantStatus.DELETED,
      new Date()
    );
    plantRepository.findByIds.mockResolvedValueOnce([
      activePlant,
      deletedPlant
    ]);
    familySummaryReader.findSummariesByIds.mockResolvedValueOnce([
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430e3',
        name: 'Solanaceae',
        slug: 'solanaceae'
      }
    ]);
    const useCase = new GetUserBookmarks({
      userBookmarksRepository,
      plantRepository,
      familySummaryReader
    });

    const result = await useCase.execute({ include: 'plant' }, user);

    expect(result.plants).toHaveLength(1);
    const enrichedList = result.plants as EnrichedFavoritePlantItem[];
    expect(enrichedList[0]?.plantId).toBe(plantId1);
  });
});
