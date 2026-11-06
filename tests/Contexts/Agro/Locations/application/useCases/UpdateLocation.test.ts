import { beforeEach, describe, expect, it } from '@jest/globals';
import { UpdateLocation } from '../../../../../../src/Contexts/Agro/Locations/application/useCases/UpdateLocation.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException,
  InvalidArgumentException
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

  it('updates spatial canvas configuration', async () => {
    const location = LocationFactory.domainBase();
    repository.addToStorage(location);

    const updated = await useCase.execute(
      {
        id: location.id,
        userId: location.userId,
        canvasWidth: 1000,
        canvasHeight: 1500,
        northAngle: 45
      },
      USER,
      [location.version]
    );

    expect(updated.canvasWidth).toBe(1000);
    expect(updated.canvasHeight).toBe(1500);
    expect(updated.northAngle).toBe(45);
    expect(updated.version).toBe(location.version + 1);
  });

  it('preserves canvas dimensions when only northAngle is updated', async () => {
    const location = LocationFactory.domainBase({
      canvasWidth: 1000,
      canvasHeight: 1500,
      northAngle: 45
    });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      {
        id: location.id,
        userId: location.userId,
        northAngle: 90
      },
      USER,
      [location.version]
    );

    expect(updated.canvasWidth).toBe(1000);
    expect(updated.canvasHeight).toBe(1500);
    expect(updated.northAngle).toBe(90);
    expect(updated.version).toBe(location.version + 1);
  });

  it('preserves northAngle when only canvas dimensions are updated', async () => {
    const location = LocationFactory.domainBase({
      canvasWidth: 1000,
      canvasHeight: 1500,
      northAngle: 45
    });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      {
        id: location.id,
        userId: location.userId,
        canvasWidth: 2000,
        canvasHeight: 2500
      },
      USER,
      [location.version]
    );

    expect(updated.canvasWidth).toBe(2000);
    expect(updated.canvasHeight).toBe(2500);
    expect(updated.northAngle).toBe(45);
    expect(updated.version).toBe(location.version + 1);
  });

  it('updates coordinates atomically and bumps the version', async () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      {
        id: location.id,
        userId: location.userId,
        latitude: 41.3879,
        longitude: 2.1699
      },
      USER,
      [location.version]
    );

    expect(updated.latitude).toBe(41.3879);
    expect(updated.longitude).toBe(2.1699);
    expect(updated.version).toBe(location.version + 1);
  });

  it('clears coordinates when null is provided and bumps the version', async () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      {
        id: location.id,
        userId: location.userId,
        latitude: null,
        longitude: null
      },
      USER,
      [location.version]
    );

    expect(updated.latitude).toBeUndefined();
    expect(updated.longitude).toBeUndefined();
    expect(updated.version).toBe(location.version + 1);
  });

  it('leaves version unchanged when clearing already-cleared coordinates', async () => {
    const location = LocationFactory.domainBase({
      latitude: undefined,
      longitude: undefined
    });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      {
        id: location.id,
        userId: location.userId,
        latitude: null,
        longitude: null
      },
      USER,
      [location.version]
    );

    expect(updated.version).toBe(location.version);
  });

  it('throws InvalidArgumentException when only latitude is provided', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    const executeAction = () =>
      useCase.execute(
        {
          id: location.id,
          userId: location.userId,
          latitude: 41.3879
        },
        USER,
        [location.version]
      );

    await expect(executeAction).rejects.toThrow(InvalidArgumentException);
  });

  it('throws InvalidArgumentException when only longitude is provided', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    const executeAction = () =>
      useCase.execute(
        {
          id: location.id,
          userId: location.userId,
          longitude: 2.1699
        },
        USER,
        [location.version]
      );

    await expect(executeAction).rejects.toThrow(InvalidArgumentException);
  });

  it('leaves omitted coordinates unchanged when updating name', async () => {
    const location = LocationFactory.domainBase({
      latitude: 40.4168,
      longitude: -3.7038
    });
    repository.addToStorage(location);

    const updated = await useCase.execute(
      { id: location.id, userId: location.userId, name: 'Nuevo nombre' },
      USER,
      [location.version]
    );

    expect(updated.name).toBe('Nuevo nombre');
    expect(updated.latitude).toBe(40.4168);
    expect(updated.longitude).toBe(-3.7038);
  });

  it('rejects renaming to a duplicate active name', async () => {
    const location = LocationFactory.domainBase({ name: 'Original' });
    const other = LocationFactory.domainBase({
      userId: location.userId,
      name: 'Tomado'
    });
    repository.addToStorage(location);
    repository.addToStorage(other);

    const executeAction = () =>
      useCase.execute(
        { id: location.id, userId: location.userId, name: 'Tomado' },
        USER,
        [location.version]
      );

    await expect(executeAction).rejects.toBeInstanceOf(DomainConflictException);
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
    const executeAction = () =>
      useCase.execute(
        { id: random.uuid(), userId: random.uuid(), name: 'x' },
        USER,
        [0]
      );

    await expect(executeAction).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws stale version when the expected version does not match', async () => {
    const location = LocationFactory.domainBase({});
    repository.addToStorage(location);

    const executeAction = () =>
      useCase.execute(
        { id: location.id, userId: location.userId, name: 'x' },
        USER,
        [location.version + 1]
      );

    await expect(executeAction).rejects.toBeInstanceOf(
      DomainStaleVersionException
    );
  });
});
