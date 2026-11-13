import { GetGardenInputByIdOrSlug } from '../../../../../../src/Contexts/Agro/GardenInputs/application/useCases/GetGardenInputByIdOrSlug.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import {
  catalogIdKey,
  catalogSlugKey
} from '../../../../../../src/Contexts/shared/application/cache/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { random } from '../../../../shared/fixtures/random.js';
import { GardenInputReadRepositoryMock } from '../../__mocks__/GardenInputReadRepositoryMock.js';
import { GardenInputReadViewMother } from '../queries/GardenInputReadViewMother.js';

const CATALOG_TTL = 86400;

const curator: UserSessionInfo = {
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles: ['collaborator']
};

describe('GetGardenInputByIdOrSlug', () => {
  let repository: GardenInputReadRepositoryMock;
  let cache: CacheRepositoryFake;
  let useCase: GetGardenInputByIdOrSlug;

  beforeEach(() => {
    repository = new GardenInputReadRepositoryMock();
    cache = new CacheRepositoryFake();
    useCase = new GetGardenInputByIdOrSlug({
      gardenInputReadRepository: repository,
      cacheRepository: cache,
      cacheCatalogTtlSeconds: CATALOG_TTL
    });
  });

  it('returns active garden input by slug for anonymous visitor', async () => {
    const view = GardenInputReadViewMother.base();
    repository.addToStorage(view);

    const result = await useCase.execute(view.slug, undefined);

    expect(result).toEqual(view);
    repository.assertFindActiveBySlugHasBeenCalledWith(view.slug);
  });

  it('throws DomainNotFoundException when slug does not exist', async () => {
    const nonexistentSlug = random.word({ min: 4, max: 10 });

    await expect(
      useCase.execute(nonexistentSlug, undefined)
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('hides soft-deleted garden input from anonymous visitor', async () => {
    const view = GardenInputReadViewMother.deleted();
    repository.addToStorage(view);

    await expect(useCase.execute(view.slug, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('allows curator to read soft-deleted garden input', async () => {
    const view = GardenInputReadViewMother.deleted();
    repository.addToStorage(view);

    const result = await useCase.execute(view.slug, curator);

    expect(result).toEqual(view);
    repository.assertFindBySlugHasBeenCalledWith(view.slug);
  });

  it('forwards sparse fieldset options to read repository', async () => {
    const view = GardenInputReadViewMother.base();
    repository.addToStorage(view);

    const result = await useCase.execute(view.slug, undefined, {
      fields: ['id', 'slug', 'name']
    });

    expect(result).toEqual({
      id: view.id,
      slug: view.slug,
      name: view.name
    });
    repository.assertFindActiveBySlugHasBeenCalledWith(view.slug, {
      fields: ['id', 'slug', 'name']
    });
  });

  it('resolves garden input by UUID', async () => {
    const id = random.uuid();
    const view = { ...GardenInputReadViewMother.base(), id };
    repository.addToStorage(view);

    const result = await useCase.execute(id, undefined);

    expect(result).toEqual(view);
  });

  it('allows curator to read soft-deleted garden input by UUID', async () => {
    const id = random.uuid();
    const view = { ...GardenInputReadViewMother.deleted(), id };
    repository.addToStorage(view);

    const result = await useCase.execute(id, curator);

    expect(result).toEqual(view);
  });

  it('hides soft-deleted garden input by UUID from anonymous visitor', async () => {
    const id = random.uuid();
    const view = { ...GardenInputReadViewMother.deleted(), id };
    repository.addToStorage(view);

    const executeAction = useCase.execute(id, undefined);

    await expect(executeAction).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it.each([
    {
      identifierType: 'slug',
      getKey: (view: ReturnType<typeof GardenInputReadViewMother.base>) =>
        view.slug,
      expectedCacheKey: (
        view: ReturnType<typeof GardenInputReadViewMother.base>
      ) => catalogSlugKey('gardenInputs', view.slug)
    },
    {
      identifierType: 'id',
      getKey: (view: ReturnType<typeof GardenInputReadViewMother.base>) =>
        view.id,
      expectedCacheKey: (
        view: ReturnType<typeof GardenInputReadViewMother.base>
      ) => catalogIdKey('gardenInputs', view.id)
    }
  ])(
    'caches the active entry for a public read by $identifierType with the catalog TTL',
    async ({ getKey, expectedCacheKey }) => {
      const view = GardenInputReadViewMother.base();
      repository.addToStorage(view);

      await useCase.execute(getKey(view), undefined);

      expect(cache.setMock).toHaveBeenCalledWith(
        expectedCacheKey(view),
        view,
        CATALOG_TTL
      );
    }
  );

  it('serves a repeated public read from cache without re-querying', async () => {
    const view = GardenInputReadViewMother.base();
    repository.addToStorage(view);
    const findActiveBySlug = jest.spyOn(repository, 'findActiveBySlug');

    await useCase.execute(view.slug, undefined);
    await useCase.execute(view.slug, undefined);

    expect(findActiveBySlug).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache entirely for a curator read', async () => {
    const view = GardenInputReadViewMother.base();
    repository.addToStorage(view);

    await useCase.execute(view.slug, curator);

    expect(cache.getMock).not.toHaveBeenCalled();
    expect(cache.setMock).not.toHaveBeenCalled();
  });

  it('bypasses the cache for a sparse fieldset read', async () => {
    const view = GardenInputReadViewMother.base();
    repository.addToStorage(view);

    await useCase.execute(view.slug, undefined, { fields: ['id', 'name'] });

    expect(cache.getMock).not.toHaveBeenCalled();
    expect(cache.setMock).not.toHaveBeenCalled();
  });
});
