import { ListGardenInputs } from '../../../../../../src/Contexts/Agro/GardenInputs/application/useCases/ListGardenInputs.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { GardenInputReadRepositoryMock } from '../../__mocks__/GardenInputReadRepositoryMock.js';
import { GardenInputReadViewMother } from '../queries/GardenInputReadViewMother.js';

const CATALOG_TTL = 86400;

const curator: UserSessionInfo = {
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles: ['admin']
};

describe('ListGardenInputs', () => {
  let repository: GardenInputReadRepositoryMock;
  let cache: CacheRepositoryFake;
  let useCase: ListGardenInputs;

  beforeEach(() => {
    repository = new GardenInputReadRepositoryMock();
    cache = new CacheRepositoryFake();
    useCase = new ListGardenInputs({
      gardenInputReadRepository: repository,
      cacheRepository: cache,
      cacheCatalogTtlSeconds: CATALOG_TTL
    });
  });

  it('restricts anonymous visitors to active garden inputs', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(undefined);

    repository.assertFindAllHasBeenCalledWith({
      filter: { status: { eq: 'active' } }
    });
  });

  it('does not enforce active status filter for curator', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(curator);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });

  it('preserves user filters while enforcing active status for anonymous visitor', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(undefined, {
      query: { filter: { category: { eq: 'fertilizer' } } }
    });

    repository.assertFindAllHasBeenCalledWith({
      filter: {
        category: { eq: 'fertilizer' },
        status: { eq: 'active' }
      }
    });
  });

  it('forwards pagination and sort options while enforcing active status filter', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(undefined, {
      query: {
        pagination: { page: 2, limit: 10 },
        sort: { name: 'asc' }
      }
    });

    repository.assertFindAllHasBeenCalledWith({
      pagination: { page: 2, limit: 10 },
      sort: { name: 'asc' },
      filter: { status: { eq: 'active' } }
    });
  });

  it('caches the public listing with the catalog TTL', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(undefined);

    expect(cache.setMock).toHaveBeenCalledWith(
      expect.stringContaining('agro:v1:gardenInputs:list:'),
      expect.anything(),
      CATALOG_TTL
    );
  });

  it('serves a repeated public listing from cache without re-querying', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());
    const findAll = jest.spyOn(repository, 'findAll');

    await useCase.execute(undefined);
    await useCase.execute(undefined);

    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('re-queries after the catalog generation is bumped', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());
    const findAll = jest.spyOn(repository, 'findAll');

    await useCase.execute(undefined);
    await cache.bumpGeneration('agro:v1:gardenInputs');
    await useCase.execute(undefined);

    expect(findAll).toHaveBeenCalledTimes(2);
  });

  it('bypasses the cache entirely for curator listings', async () => {
    repository.addToStorage(GardenInputReadViewMother.base());

    await useCase.execute(curator);

    expect(cache.getMock).not.toHaveBeenCalled();
    expect(cache.setMock).not.toHaveBeenCalled();
  });
});
