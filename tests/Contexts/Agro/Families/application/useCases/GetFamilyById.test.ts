import { GetFamilyById } from '../../../../../../src/Contexts/Agro/Families/application/useCases/GetFamilyById.js';
import { catalogIdKey } from '../../../../../../src/Contexts/shared/application/cache/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilyReadRepositoryMock } from '../../__mocks__/FamilyReadRepositoryMock.js';
import { FamilyReadViewMother } from '../queries/FamilyReadViewMother.js';

const CATALOG_TTL = 86400;

describe('GetFamilyById', () => {
  let repository: FamilyReadRepositoryMock;
  let cache: CacheRepositoryFake;
  let useCase: GetFamilyById;

  beforeEach(() => {
    repository = new FamilyReadRepositoryMock();
    cache = new CacheRepositoryFake();
    useCase = new GetFamilyById({
      familyReadRepository: repository,
      cacheRepository: cache,
      cacheCatalogTtlSeconds: CATALOG_TTL
    });
  });

  it('should return a family when it exists', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);

    await expect(useCase.execute(family.id)).resolves.toEqual(family);

    repository.assertFindByIdHasBeenCalledWith(family.id);
  });

  it('should throw not found error when family does not exist', async () => {
    const id = random.uuid();

    await expect(useCase.execute(id)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindByIdHasBeenCalledWith(id);
  });

  it('should forward the fieldset to the repository', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);
    const options = { fields: ['name', 'slug'] as const };

    await expect(useCase.execute(family.id, options)).resolves.toEqual({
      id: family.id,
      name: family.name,
      slug: family.slug
    });

    repository.assertFindByIdHasBeenCalledWith(family.id, options);
  });

  it('returns stored data as is, without building a Family', async () => {
    const family = FamilyReadViewMother.breakingABusinessRule();
    repository.addToStorage(family);

    await expect(useCase.execute(family.id)).resolves.toBe(family);
  });

  it('caches the full entry under its id key with the catalog TTL', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);

    await useCase.execute(family.id);

    expect(cache.setMock).toHaveBeenCalledWith(
      catalogIdKey('families', family.id),
      family,
      CATALOG_TTL
    );
  });

  it('serves a repeated read from cache without re-querying the repository', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);
    const findById = jest.spyOn(repository, 'findById');

    await useCase.execute(family.id);
    await useCase.execute(family.id);

    expect(findById).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache for a sparse fieldset read', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);
    const options = { fields: ['name'] as const };

    await useCase.execute(family.id, options);

    expect(cache.getMock).not.toHaveBeenCalled();
    expect(cache.setMock).not.toHaveBeenCalled();
    repository.assertFindByIdHasBeenCalledWith(family.id, options);
  });
});
