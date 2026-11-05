import { randomUUID } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import { locationInputMapper } from '../../../../../src/Contexts/Agro/Locations/mappers/locationInputMapper.js';

describe('locationInputMapper', () => {
  it('maps CreateLocationInput with mandatory coordinates to Location entity', () => {
    const input = {
      id: randomUUID(),
      userId: randomUUID(),
      name: 'Huerto Urbano',
      latitude: 40.4168,
      longitude: -3.7038
    };

    const location = locationInputMapper.fromCreateInputToDomain(
      input,
      'test-user'
    );

    expect(location.id).toBe(input.id);
    expect(location.userId).toBe(input.userId);
    expect(location.name).toBe('Huerto Urbano');
    expect(location.latitude).toBe(40.4168);
    expect(location.longitude).toBe(-3.7038);
  });

  it('maps CreateLocationInput without coordinates to Location entity', () => {
    const input = {
      id: randomUUID(),
      userId: randomUUID(),
      name: 'Huerto Sin GPS'
    };

    const location = locationInputMapper.fromCreateInputToDomain(
      input,
      'test-user'
    );

    expect(location.id).toBe(input.id);
    expect(location.userId).toBe(input.userId);
    expect(location.name).toBe('Huerto Sin GPS');
    expect(location.latitude).toBeUndefined();
    expect(location.longitude).toBeUndefined();
  });

  it('maps UpdateLocationInput with coordinates to LocationChanges', () => {
    const input = {
      id: randomUUID(),
      userId: randomUUID(),
      name: 'Nuevo Nombre',
      latitude: 41.3879,
      longitude: 2.1699
    };

    const changes = locationInputMapper.toChanges(input);

    expect(changes.name).toBe('Nuevo Nombre');
    expect(changes.latitude).toBe(41.3879);
    expect(changes.longitude).toBe(2.1699);
  });

  it('maps UpdateLocationInput with null coordinates to LocationChanges', () => {
    const input = {
      id: randomUUID(),
      userId: randomUUID(),
      latitude: null,
      longitude: null
    };

    const changes = locationInputMapper.toChanges(input);

    expect(changes.latitude).toBeNull();
    expect(changes.longitude).toBeNull();
  });
});
