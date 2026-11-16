import { GetFamilyBySlug } from '../../../../../../src/Contexts/Agro/Families/application/useCases/GetFamilyBySlug.js';
import { catalogSlugKey } from '../../../../../../src/Contexts/shared/application/cache/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilyReadRepositoryMock } from '../../__mocks__/FamilyReadRepositoryMock.js';
import { FamilyReadViewMother } from '../queries/FamilyReadViewMother.js';

const CATALOG_TTL = 86400;

describe('GetFamilyBySlug', () => {
  let repository: FamilyReadRepositoryMock;
  let cache: CacheRepositoryFake;
  let useCase: GetFamilyBySlug;

  beforeEach(() => {
    repository = new FamilyReadRepositoryMock();
    cache = new CacheRepositoryFake();
    useCase = new GetFamilyBySlug({
      familyReadRepository: repository,
      cacheRepository: cache,
      cacheCatalogTtlSeconds: CATALOG_TTL
    });
  });

  it('should return a family when it exists', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);

    await expect(useCase.execute(family.slug)).resolves.toEqual(family);

    repository.assertFindBySlugHasBeenCalledWith(family.slug);
  });

  it('should throw not found error when family does not exist', async () => {
    const slug = random.word();

    await expect(useCase.execute(slug)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindBySlugHasBeenCalledWith(slug);
  });

  it('should forward the fieldset to the repository', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);
    const options = { fields: ['name', 'slug'] as const };

    await expect(useCase.execute(family.slug, options)).resolves.toEqual({
      id: family.id,
      name: family.name,
      slug: family.slug
    });

    repository.assertFindBySlugHasBeenCalledWith(family.slug, options);
  });

  it('returns stored data as is, without building a Family', async () => {
    const family = FamilyReadViewMother.breakingABusinessRule();
    repository.addToStorage(family);

    await expect(useCase.execute(family.slug)).resolves.toBe(family);
  });

  it('caches the full entry under its slug key with the catalog TTL', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);

    await useCase.execute(family.slug);

    expect(cache.setMock).toHaveBeenCalledWith(
      catalogSlugKey('families', family.slug),
      family,
      CATALOG_TTL
    );
  });

  it('serves a repeated read from cache without re-querying the repository', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);
    const findBySlug = jest.spyOn(repository, 'findBySlug');

    await useCase.execute(family.slug);
    await useCase.execute(family.slug);

    expect(findBySlug).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache for a sparse fieldset read', async () => {
    const family = FamilyReadViewMother.base();
    repository.addToStorage(family);
    const options = { fields: ['name', 'slug'] as const };

    await useCase.execute(family.slug, options);

    expect(cache.getMock).not.toHaveBeenCalled();
    expect(cache.setMock).not.toHaveBeenCalled();
    repository.assertFindBySlugHasBeenCalledWith(family.slug, options);
  });
});
