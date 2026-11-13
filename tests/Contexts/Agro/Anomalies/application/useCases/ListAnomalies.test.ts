import { ListAnomalies } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/ListAnomalies.js';
import { AnomalyStatus } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyStatus.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { AnomalyReadRepositoryMock } from '../../__mocks__/AnomalyReadRepositoryMock.js';
import { AnomalyReadViewMother } from '../queries/AnomalyReadViewMother.js';

const CATALOG_TTL = 86400;

const curator: UserSessionInfo = {
  id: 'id',
  username: 'curator',
  email: 'curator@example.com',
  roles: ['admin']
};

describe('ListAnomalies', () => {
  let repository: AnomalyReadRepositoryMock;
  let cache: CacheRepositoryFake;
  let useCase: ListAnomalies;

  beforeEach(() => {
    repository = new AnomalyReadRepositoryMock();
    cache = new CacheRepositoryFake();
    useCase = new ListAnomalies({
      anomalyReadRepository: repository,
      cacheRepository: cache,
      cacheCatalogTtlSeconds: CATALOG_TTL
    });
  });

  it('restricts anonymous callers to ACTIVE anomalies', async () => {
    repository.addToStorage(AnomalyReadViewMother.base());

    await useCase.execute(undefined);

    repository.assertFindAllHasBeenCalledWith({
      filter: { status: { eq: AnomalyStatus.ACTIVE } }
    });
  });

  it('does not force a status filter for a curator', async () => {
    repository.addToStorage(AnomalyReadViewMother.base());

    await useCase.execute(curator);

    repository.assertFindAllHasBeenCalledWith({ filter: {} });
  });

  it('caches the public listing with the catalog TTL', async () => {
    repository.addToStorage(AnomalyReadViewMother.base());

    await useCase.execute(undefined);

    expect(cache.setMock).toHaveBeenCalledWith(
      expect.stringContaining('agro:v1:anomalies:list:'),
      expect.anything(),
      CATALOG_TTL
    );
  });

  it('serves a repeated public listing from cache without re-querying', async () => {
    repository.addToStorage(AnomalyReadViewMother.base());
    const findAll = jest.spyOn(repository, 'findAll');

    await useCase.execute(undefined);
    await useCase.execute(undefined);

    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('re-queries after the catalog generation is bumped', async () => {
    repository.addToStorage(AnomalyReadViewMother.base());
    const findAll = jest.spyOn(repository, 'findAll');

    await useCase.execute(undefined);
    await cache.bumpGeneration('agro:v1:anomalies');
    await useCase.execute(undefined);

    expect(findAll).toHaveBeenCalledTimes(2);
  });

  it('bypasses the cache entirely for curator listings', async () => {
    repository.addToStorage(AnomalyReadViewMother.base());

    await useCase.execute(curator);

    expect(cache.getMock).not.toHaveBeenCalled();
    expect(cache.setMock).not.toHaveBeenCalled();
  });
});
