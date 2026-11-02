import { GetLocationById } from '../../../../../../src/Contexts/Agro/Locations/application/useCases/GetLocationById.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../domain/mothers/LocationFactory.js';

describe('GetLocationById', () => {
  let repository: LocationRepositoryMock;
  let useCase: GetLocationById;

  beforeEach(() => {
    repository = new LocationRepositoryMock();
    useCase = new GetLocationById({ locationRepository: repository });
  });

  it('returns the owned active location', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    const result = await useCase.execute(location.id, location.userId);

    expect(result.id).toBe(location.id);
  });

  it('throws 404 for an unknown id', async () => {
    await expect(
      useCase.execute(random.uuid(), random.uuid())
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws 404 for a non-owned location (no disclosure)', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    await expect(
      useCase.execute(location.id, random.uuid())
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws 404 for a soft-deleted location', async () => {
    const location = LocationFactory.deleted();
    repository.addToStorage(location);

    await expect(
      useCase.execute(location.id, location.userId)
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });
});
