import type { ListFamiliesDto } from '../../../../../../src/Contexts/Agro/Families/application/useCases/interfaces/ListFamiliesDto.js';
import { ListFamilies } from '../../../../../../src/Contexts/Agro/Families/application/useCases/ListFamilies.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { FamilyReadRepositoryMock } from '../../__mocks__/FamilyReadRepositoryMock.js';
import { FamilyReadViewMother } from '../queries/FamilyReadViewMother.js';

const CATALOG_TTL = 86400;

describe('ListFamilies', () => {
  let repository: FamilyReadRepositoryMock;
  let cache: CacheRepositoryFake;
  let useCase: ListFamilies;

  beforeEach(() => {
    repository = new FamilyReadRepositoryMock();
    cache = new CacheRepositoryFake();
    useCase = new ListFamilies({
      familyReadRepository: repository,
      cacheRepository: cache,
      cacheCatalogTtlSeconds: CATALOG_TTL
    });
  });

  it('should return families from repository', async () => {
    repository.addToStorage(FamilyReadViewMother.random());
    repository.addToStorage(FamilyReadViewMother.random());

    const { data } = await useCase.execute();

    expect(data).toHaveLength(2);
  });

  it('should forward query options to repository', async () => {
    const dto: ListFamiliesDto = {
      query: {
        filter: { name: { eq: 'Rosaceae' } },
        sort: { name: 'asc' },
        pagination: { page: 1, limit: 5 },
        fields: ['name', 'slug']
      }
    };

    await useCase.execute(dto);

    repository.assertFindAllHasBeenCalledWith(dto.query);
  });

  it('should return only id and the selected fields', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);

    const { data } = await useCase.execute({ query: { fields: ['name'] } });

    expect(data).toEqual([{ id: family.id, name: family.name }]);
  });

  it('returns stored data as is, without building a Family', async () => {
    const family = FamilyReadViewMother.breakingABusinessRule();
    repository.addToStorage(family);

    const { data } = await useCase.execute();

    expect(data[0]).toBe(family);
  });

  it('caches the listing with the catalog TTL', async () => {
    repository.addToStorage(FamilyReadViewMother.random());

    await useCase.execute();

    expect(cache.setMock).toHaveBeenCalledWith(
      expect.stringContaining('agro:v1:families:list:'),
      expect.anything(),
      CATALOG_TTL
    );
  });

  it('serves a repeated listing from cache without re-querying the repository', async () => {
    repository.addToStorage(FamilyReadViewMother.random());
    const findAll = jest.spyOn(repository, 'findAll');

    await useCase.execute();
    await useCase.execute();

    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('re-queries after the catalog generation is bumped', async () => {
    repository.addToStorage(FamilyReadViewMother.random());
    const findAll = jest.spyOn(repository, 'findAll');

    await useCase.execute();
    await cache.bumpGeneration('agro:v1:families');
    await useCase.execute();

    expect(findAll).toHaveBeenCalledTimes(2);
  });
});
