import { DeleteLocation } from '../../../../../../src/Contexts/Agro/Locations/application/useCases/DeleteLocation.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../domain/mothers/LocationFactory.js';

describe('DeleteLocation', () => {
  let repository: LocationRepositoryMock;
  let useCase: DeleteLocation;
  const USER = 'grower';

  beforeEach(() => {
    repository = new LocationRepositoryMock();
    useCase = new DeleteLocation({ locationRepository: repository });
  });

  it('soft-deletes the location (stored status: deleted)', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    await useCase.execute(location.id, location.userId, USER, [
      location.version
    ]);

    expect(repository.getStoredPrimitives(location.id)?.status).toBe('deleted');
  });

  it('throws 404 for an unknown location', async () => {
    await expect(
      useCase.execute(random.uuid(), random.uuid(), USER, [0])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws stale version when the expected version does not match', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    await expect(
      useCase.execute(location.id, location.userId, USER, [
        location.version + 1
      ])
    ).rejects.toBeInstanceOf(DomainStaleVersionException);
  });
});
