import { UpdateLocation } from '../../../../../../src/Contexts/Agro/Locations/application/useCases/UpdateLocation.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../domain/mothers/LocationFactory.js';

describe('UpdateLocation', () => {
  let repository: LocationRepositoryMock;
  let useCase: UpdateLocation;
  const USER = 'grower';

  beforeEach(() => {
    repository = new LocationRepositoryMock();
    useCase = new UpdateLocation({ locationRepository: repository });
  });

  it('sets a provided geographic field and bumps the version', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    const updated = await useCase.execute(
      { id: location.id, userId: location.userId, country: 'Argentina' },
      USER,
      [location.version]
    );

    expect(updated.country).toBe('Argentina');
    expect(updated.version).toBe(location.version + 1);
  });

  it('unsets a field with null', async () => {
    const location = LocationFactory.domainBase({ country: 'Argentina' });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      { id: location.id, userId: location.userId, country: null },
      USER,
      [location.version]
    );

    expect(updated.country).toBeUndefined();
  });

  it('leaves omitted fields unchanged', async () => {
    const location = LocationFactory.domainBase({ country: 'Argentina' });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      { id: location.id, userId: location.userId, name: 'Nuevo nombre' },
      USER,
      [location.version]
    );

    expect(updated.name).toBe('Nuevo nombre');
    expect(updated.country).toBe('Argentina');
  });

  it('rejects renaming to a duplicate active name', async () => {
    const location = LocationFactory.domainBase({ name: 'Original' });
    const other = LocationFactory.domainBase({
      userId: location.userId,
      name: 'Tomado'
    });
    repository.addToStorage(location);
    repository.addToStorage(other);

    await expect(
      useCase.execute(
        { id: location.id, userId: location.userId, name: 'Tomado' },
        USER,
        [location.version]
      )
    ).rejects.toBeInstanceOf(DomainConflictException);
  });

  it('allows renaming to its own current name (no-op)', async () => {
    const location = LocationFactory.domainBase({ name: 'Mismo' });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      { id: location.id, userId: location.userId, name: 'Mismo' },
      USER,
      [location.version]
    );

    expect(updated.name).toBe('Mismo');
  });

  it('throws 404 for an unknown location', async () => {
    await expect(
      useCase.execute(
        { id: random.uuid(), userId: random.uuid(), name: 'x' },
        USER,
        [0]
      )
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws stale version when the expected version does not match', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    await expect(
      useCase.execute(
        { id: location.id, userId: location.userId, name: 'x' },
        USER,
        [location.version + 1]
      )
    ).rejects.toBeInstanceOf(DomainStaleVersionException);
  });
});
