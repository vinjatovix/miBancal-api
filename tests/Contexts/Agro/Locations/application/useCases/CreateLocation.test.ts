import { beforeEach, describe, expect, it } from '@jest/globals';
import { CreateLocation } from '../../../../../../src/Contexts/Agro/Locations/application/useCases/CreateLocation.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../domain/mothers/LocationFactory.js';

describe('CreateLocation', () => {
  let repository: LocationRepositoryMock;
  let useCase: CreateLocation;
  const USER = 'grower';
  const USER_ID = random.uuid();

  beforeEach(() => {
    repository = new LocationRepositoryMock();
    useCase = new CreateLocation({ locationRepository: repository });
  });

  it('creates and stores the location with coordinates', async () => {
    const input = {
      id: random.uuid(),
      userId: USER_ID,
      name: 'Huerto',
      latitude: 40.4168,
      longitude: -3.7038
    };

    const location = await useCase.execute(input, USER);

    expect(location.name).toBe('Huerto');
    expect(location.latitude).toBe(40.4168);
    expect(location.longitude).toBe(-3.7038);
    expect(repository.getStored(input.id)?.latitude).toBe(40.4168);
    expect(repository.getStored(input.id)?.longitude).toBe(-3.7038);
  });

  it('rejects a duplicate active name for the same owner', async () => {
    const existing = LocationFactory.domainBase({ name: 'Huerto' });
    repository.addToStorage(existing);

    const executeAction = () =>
      useCase.execute(
        {
          id: random.uuid(),
          userId: existing.userId,
          name: 'Huerto',
          latitude: 40.4168,
          longitude: -3.7038
        },
        USER
      );

    await expect(executeAction).rejects.toBeInstanceOf(DomainConflictException);
    repository.assertSaveNotCalled();
  });

  it('allows the same name for a different owner', async () => {
    const existing = LocationFactory.domainBase({ name: 'Huerto' });
    repository.addToStorage(existing);

    const location = await useCase.execute(
      {
        id: random.uuid(),
        userId: USER_ID,
        name: 'Huerto',
        latitude: 40.4168,
        longitude: -3.7038
      },
      USER
    );

    expect(location.name).toBe('Huerto');
    expect(location.latitude).toBe(40.4168);
    expect(location.longitude).toBe(-3.7038);
  });
});
