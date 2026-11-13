import { Location } from '../../../../../../src/Contexts/Agro/Locations/domain/entities/Location.js';
import type { LocationProps } from '../../../../../../src/Contexts/Agro/Locations/domain/entities/types/LocationProps.js';
import { randomLocationId } from '../../../../../../src/Contexts/Agro/Locations/domain/LocationId.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { random } from '../../../../shared/fixtures/random.js';

const USER = 'test-grower';

export const LocationFactory = {
  propsBase: (overrides?: Partial<LocationProps>): LocationProps => ({
    id: randomLocationId(),
    userId: randomUserId(),
    name: 'Huerto trasero',
    latitude: 40.4168,
    longitude: -3.7038,
    metadata: Metadata.create(USER),
    ...overrides
  }),

  domainBase: (overrides?: Partial<LocationProps>): Location =>
    Location.create(LocationFactory.propsBase(overrides)),

  withoutCoordinates: (overrides?: Partial<LocationProps>): Location =>
    Location.create(
      LocationFactory.propsBase({
        latitude: undefined,
        longitude: undefined,
        ...overrides
      })
    ),

  deleted: (overrides?: Partial<LocationProps>): Location =>
    Location.create(
      LocationFactory.propsBase({
        status: 'deleted',
        deletedAt: new Date(),
        ...overrides
      })
    ),

  randomName: (): string => `Parcela ${random.uuid().slice(0, 8)}`
};
