import { GetAnomalyBySlug } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/GetAnomalyBySlug.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import {
  catalogIdKey,
  catalogSlugKey
} from '../../../../../../src/Contexts/shared/application/cache/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { random } from '../../../../shared/fixtures/random.js';
import { AnomalyReadRepositoryMock } from '../../__mocks__/AnomalyReadRepositoryMock.js';
import { AnomalyReadViewMother } from '../queries/AnomalyReadViewMother.js';

const CATALOG_TTL = 86400;

const curator: UserSessionInfo = {
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles: ['collaborator']
};

describe('GetAnomalyBySlug', () => {
  let repository: AnomalyReadRepositoryMock;
  let cache: CacheRepositoryFake;
  let useCase: GetAnomalyBySlug;

  beforeEach(() => {
    repository = new AnomalyReadRepositoryMock();
    cache = new CacheRepositoryFake();
    useCase = new GetAnomalyBySlug({
      anomalyReadRepository: repository,
      cacheRepository: cache,
      cacheCatalogTtlSeconds: CATALOG_TTL
    });
  });

  it('returns an active anomaly by slug for an anonymous caller', async () => {
    const view = AnomalyReadViewMother.base();
    repository.addToStorage(view);

    await expect(useCase.execute(view.slug, undefined)).resolves.toEqual(view);
    repository.assertFindActiveBySlugHasBeenCalledWith(view.slug);
  });

  it('throws not found when the slug does not exist', async () => {
    const slug = random.word({ min: 4, max: 10 });

    await expect(useCase.execute(slug, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('hides a soft-deleted anomaly from an anonymous caller', async () => {
    const view = AnomalyReadViewMother.deleted();
    repository.addToStorage(view);

    await expect(useCase.execute(view.slug, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('lets a curator read a soft-deleted anomaly', async () => {
    const view = AnomalyReadViewMother.deleted();
    repository.addToStorage(view);

    await expect(useCase.execute(view.slug, curator)).resolves.toEqual(view);
    repository.assertFindBySlugHasBeenCalledWith(view.slug);
  });

  it('resolves a UUID key by id', async () => {
    const id = random.uuid();
    const view = { ...AnomalyReadViewMother.base(), id };
    repository.addToStorage(view);

    await expect(useCase.execute(id, undefined)).resolves.toEqual(view);
  });

  it('lets a curator read a soft-deleted anomaly by UUID', async () => {
    const id = random.uuid();
    const view = { ...AnomalyReadViewMother.deleted(), id };
    repository.addToStorage(view);

    const result = await useCase.execute(id, curator);

    expect(result).toEqual(view);
  });

  it('hides a soft-deleted anomaly by UUID from an anonymous caller', async () => {
    const id = random.uuid();
    const view = { ...AnomalyReadViewMother.deleted(), id };
    repository.addToStorage(view);

    const executeAction = useCase.execute(id, undefined);

    await expect(executeAction).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it.each([
    {
      identifierType: 'slug',
      getKey: (view: ReturnType<typeof AnomalyReadViewMother.base>) =>
        view.slug,
      expectedCacheKey: (view: ReturnType<typeof AnomalyReadViewMother.base>) =>
        catalogSlugKey('anomalies', view.slug)
    },
    {
      identifierType: 'id',
      getKey: (view: ReturnType<typeof AnomalyReadViewMother.base>) => view.id,
      expectedCacheKey: (view: ReturnType<typeof AnomalyReadViewMother.base>) =>
        catalogIdKey('anomalies', view.id)
    }
  ])(
    'caches the active entry for a public read by $identifierType with the catalog TTL',
    async ({ getKey, expectedCacheKey }) => {
      const view = AnomalyReadViewMother.base();
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
    const view = AnomalyReadViewMother.base();
    repository.addToStorage(view);
    const findActiveBySlug = jest.spyOn(repository, 'findActiveBySlug');

    await useCase.execute(view.slug, undefined);
    await useCase.execute(view.slug, undefined);

    expect(findActiveBySlug).toHaveBeenCalledTimes(1);
  });

  it('bypasses the cache entirely for a curator read', async () => {
    const view = AnomalyReadViewMother.base();
    repository.addToStorage(view);

    await useCase.execute(view.slug, curator);

    expect(cache.getMock).not.toHaveBeenCalled();
    expect(cache.setMock).not.toHaveBeenCalled();
  });

  it('bypasses the cache for a sparse fieldset read', async () => {
    const view = AnomalyReadViewMother.base();
    repository.addToStorage(view);

    await useCase.execute(view.slug, undefined, { fields: ['name'] });

    expect(cache.getMock).not.toHaveBeenCalled();
    expect(cache.setMock).not.toHaveBeenCalled();
  });
});
