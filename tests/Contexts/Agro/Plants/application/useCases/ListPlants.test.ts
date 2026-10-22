import { ListPlants } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/ListPlants.js';
import { PlantStatus } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/types/PlantStatus.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { DomainUnauthorizedException } from '../../../../../../src/Contexts/shared/domain/errors/DomainUnauthorizedException.js';
import { random } from '../../../../shared/fixtures/random.js';
import { UserBookmarksRepositoryMock } from '../../../Bookmarks/__mocks__/UserBookmarksRepositoryMock.js';
import { UserBookmarksMother } from '../../../Bookmarks/domain/entities/UserBookmarksMother.js';
import { FamilySummaryReaderMock } from '../../__mocks__/FamilySummaryReaderMock.js';
import { PlantReadRepositoryMock } from '../../__mocks__/PlantReadRepositoryMock.js';
import { FamilySummaryViewMother } from '../queries/FamilySummaryViewMother.js';
import { PlantReadViewMother } from '../queries/PlantReadViewMother.js';

describe('ListPlants', () => {
  let repository: PlantReadRepositoryMock;
  let familySummaryReader: FamilySummaryReaderMock;
  let userBookmarksRepository: UserBookmarksRepositoryMock;
  let listPlants: ListPlants;
  const USER = {
    id: random.uuid(),
    roles: ['user']
  } as UserSessionInfo;
  const ADMIN = {
    id: random.uuid(),
    roles: ['admin']
  } as UserSessionInfo;
  const COLLABORATOR = {
    roles: ['collaborator']
  } as UserSessionInfo;

  beforeEach(() => {
    repository = new PlantReadRepositoryMock();
    familySummaryReader = new FamilySummaryReaderMock();
    userBookmarksRepository = new UserBookmarksRepositoryMock();
    listPlants = new ListPlants({
      plantReadRepository: repository,
      familySummaryReader,
      userBookmarksRepository
    });
  });

  it('should call repository with all plants for admin users', async () => {
    repository.addToStorage(PlantReadViewMother.deleted());
    repository.addToStorage(PlantReadViewMother.random());

    await listPlants.execute(ADMIN);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });

  it('should call repository with all plants for collaborator users', async () => {
    await listPlants.execute(COLLABORATOR);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });

  it('should call repository with active status filter for non-admin users', async () => {
    await listPlants.execute(USER);

    repository.assertFindAllHasBeenCalledWith({
      filter: {
        status: { eq: PlantStatus.ACTIVE }
      }
    });
  });

  it('should keep the user filter and add the active status for anonymous requests', async () => {
    await listPlants.execute(undefined, {
      query: { filter: { identity: { contains: 'tom' } } }
    });

    repository.assertFindAllHasBeenCalledWith({
      filter: {
        identity: { contains: 'tom' },
        status: { eq: PlantStatus.ACTIVE }
      }
    });
  });

  it('should pass sort and pagination through unchanged', async () => {
    const query = {
      sort: { name: 'desc' as const },
      pagination: { page: 2, limit: 5 }
    };

    await listPlants.execute(ADMIN, { query });

    repository.assertFindAllHasBeenCalledWith({ ...query, filter: {} });
  });

  it('returns stored data as is, without building a Plant', async () => {
    const plant = PlantReadViewMother.breakingABusinessRule();
    repository.addToStorage(plant);

    const result = await listPlants.execute(ADMIN);

    expect(result.data).toEqual([plant]);
    expect(result.data[0]).toBe(plant);
  });

  describe('with a fieldset', () => {
    it('should forward the fieldset with the visibility filter', async () => {
      await listPlants.execute(USER, { query: { fields: ['identity'] } });

      repository.assertFindAllHasBeenCalledWith({
        fields: ['identity'],
        filter: { status: { eq: PlantStatus.ACTIVE } }
      });
    });

    it('should return only id and the selected fields', async () => {
      const plant = PlantReadViewMother.random();
      repository.addToStorage(plant);

      const { data } = await listPlants.execute(ADMIN, {
        query: { fields: ['identity'] }
      });

      expect(data).toEqual([{ id: plant.id, identity: plant.identity }]);
    });
  });

  describe('including the family', () => {
    it('should never send include to the repository', async () => {
      await listPlants.execute(ADMIN, { query: { include: ['family'] } });

      repository.assertFindAllHasBeenCalledWith({ filter: {} });
    });

    it('should embed each plant its own family with one read', async () => {
      const [first, second] = [
        FamilySummaryViewMother.random(),
        FamilySummaryViewMother.random()
      ];
      familySummaryReader.add(first, second);
      const plants = [
        PlantReadViewMother.ofFamily(first.id),
        PlantReadViewMother.ofFamily(second.id),
        PlantReadViewMother.ofFamily(first.id)
      ];
      plants.forEach((plant) => repository.addToStorage(plant));

      const { data } = await listPlants.execute(ADMIN, {
        query: { include: ['family'] }
      });

      expect(data.map((plant) => plant.identity?.family)).toEqual([
        first,
        second,
        first
      ]);
      familySummaryReader.assertCalledOnceWith([first.id, second.id]);
    });

    it('should not read families without include', async () => {
      repository.addToStorage(PlantReadViewMother.ofFamily(random.uuid()));

      await listPlants.execute(ADMIN);

      familySummaryReader.assertNotCalled();
    });

    it('should not read families when the fieldset leaves out identity', async () => {
      repository.addToStorage(PlantReadViewMother.ofFamily(random.uuid()));

      const { data } = await listPlants.execute(ADMIN, {
        query: { include: ['family'], fields: ['traits'] }
      });

      expect(data[0]).not.toHaveProperty('identity');
      familySummaryReader.assertNotCalled();
    });
  });

  describe('with bookmark filter', () => {
    it('should throw authentication error for anonymous users', async () => {
      await expect(
        listPlants.execute(undefined, {
          query: { filter: { bookmarked: { eq: true } } }
        })
      ).rejects.toThrow(DomainUnauthorizedException);
    });

    it('should filter by bookmarked plants', async () => {
      const plant1 = PlantReadViewMother.random();
      const bookmarks = UserBookmarksMother.ofPlants(USER.id, [plant1.id]);
      userBookmarksRepository.addToStorage(bookmarks);

      await listPlants.execute(USER, {
        query: { filter: { bookmarked: { eq: true } } }
      });

      repository.assertFindAllHasBeenCalledWith({
        filter: { id: { in: [plant1.id] }, status: { eq: PlantStatus.ACTIVE } }
      });
    });

    it('should filter by non-bookmarked plants', async () => {
      const plant1 = PlantReadViewMother.random();
      const bookmarks = UserBookmarksMother.ofPlants(USER.id, [plant1.id]);
      userBookmarksRepository.addToStorage(bookmarks);

      await listPlants.execute(USER, {
        query: { filter: { bookmarked: { eq: false } } }
      });

      repository.assertFindAllHasBeenCalledWith({
        filter: { id: { nin: [plant1.id] }, status: { eq: PlantStatus.ACTIVE } }
      });
    });
  });
});
