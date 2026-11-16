import { UpdateLocationBedsLayout } from '../../../../../../src/Contexts/Agro/Locations/application/useCases/UpdateLocationBedsLayout.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../../Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { LocationRepositoryMock } from '../../__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../domain/mothers/LocationFactory.js';

describe('UpdateLocationBedsLayout', () => {
  const CURRENT_VERSION = 0;
  let locationRepository: LocationRepositoryMock;
  let bedRepository: BedRepositoryMock;
  let useCase: UpdateLocationBedsLayout;

  const USER: UserSessionInfo = {
    username: 'layout-designer',
    id: random.uuid(),
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    locationRepository = new LocationRepositoryMock();
    bedRepository = new BedRepositoryMock();
    useCase = new UpdateLocationBedsLayout({
      locationRepository,
      bedRepository
    });
  });

  it.each([
    [
      'positive coordinates',
      { x: 100, y: 100 },
      { x: 400, y: 100 },
      { x: 100, y: 100 },
      { x: 400, y: 100 }
    ],
    [
      'negative coordinates across multiple quadrants',
      { x: -261.58, y: 90.5 },
      { x: -150.0, y: -300.0 },
      { x: -261.58, y: 90.5 },
      { x: -150, y: -300 }
    ]
  ])(
    'updates positions and rotations for multiple beds with %s and increments location version',
    async (_desc, posA, posB, expectedPosA, expectedPosB) => {
      const location = LocationFactory.domainBase({
        userId: createUserId(USER.id),
        northAngle: 45
      });
      locationRepository.addToStorage(location);

      const bedA = BedFactory.create({
        userId: createUserId(USER.id),
        locationId: location.id,
        width: PositiveNumber.create(100),
        height: PositiveNumber.create(200)
      });
      const bedB = BedFactory.create({
        userId: createUserId(USER.id),
        locationId: location.id,
        width: PositiveNumber.create(100),
        height: PositiveNumber.create(200)
      });
      bedRepository.addToStorage(bedA);
      bedRepository.addToStorage(bedB);

      const updatedLocation = await useCase.execute(
        {
          locationId: location.id,
          userId: USER.id,
          layouts: [
            { id: bedA.id, position: posA, rotation: 0 },
            { id: bedB.id, position: posB, rotation: 90 }
          ]
        },
        USER,
        [CURRENT_VERSION]
      );

      expect(updatedLocation.version).toBe(CURRENT_VERSION + 1);
      expect(bedA.position).toEqual(expectedPosA);
      expect(bedA.rotation).toBe(0);
      expect(bedA.netOrientation).toBe(45);
      expect(bedB.position).toEqual(expectedPosB);
      expect(bedB.rotation).toBe(90);
      expect(bedB.netOrientation).toBe(135);
    }
  );

  it('preserves coordinates and rotation for beds omitted from the layout update', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id)
    });
    locationRepository.addToStorage(location);

    const omittedBed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100),
      position: { x: 50, y: 50 },
      rotation: 0
    });
    const targetBed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100)
    });
    bedRepository.addToStorage(omittedBed);
    bedRepository.addToStorage(targetBed);

    await useCase.execute(
      {
        locationId: location.id,
        userId: USER.id,
        layouts: [
          { id: targetBed.id, position: { x: 300, y: 300 }, rotation: 0 }
        ]
      },
      USER,
      [CURRENT_VERSION]
    );

    expect(omittedBed.position).toEqual({ x: 50, y: 50 });
    expect(omittedBed.rotation).toBe(0);
    expect(targetBed.position).toEqual({ x: 300, y: 300 });
    expect(targetBed.rotation).toBe(0);
    expect(targetBed.netOrientation).toBe(0);
  });

  it('unplaces a placed bed when position is explicitly provided as null', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id)
    });
    locationRepository.addToStorage(location);

    const placedBed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      position: { x: 100, y: 100 },
      rotation: 90
    });
    bedRepository.addToStorage(placedBed);

    const updatedLocation = await useCase.execute(
      {
        locationId: location.id,
        userId: USER.id,
        layouts: [{ id: placedBed.id, position: null }]
      },
      USER,
      [CURRENT_VERSION]
    );

    expect(updatedLocation.version).toBe(CURRENT_VERSION + 1);
    expect(placedBed.position).toBeUndefined();
    expect(placedBed.rotation).toBeUndefined();
    expect(placedBed.netOrientation).toBeUndefined();
  });

  it('throws not found exception when location does not exist', async () => {
    const execution = useCase.execute(
      {
        locationId: random.uuid(),
        userId: USER.id,
        layouts: [
          { id: random.uuid(), position: { x: 10, y: 10 }, rotation: 0 }
        ]
      },
      USER,
      [CURRENT_VERSION]
    );

    await expect(execution).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws stale version exception when expected location version does not match', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id),
      version: 5
    });
    locationRepository.addToStorage(location);

    const execution = useCase.execute(
      {
        locationId: location.id,
        userId: USER.id,
        layouts: []
      },
      USER,
      [2]
    );

    await expect(execution).rejects.toBeInstanceOf(DomainStaleVersionException);
  });

  it('throws not found exception when a specified bed does not belong to the target location', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id)
    });
    locationRepository.addToStorage(location);

    const externalBed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: random.uuid()
    });
    bedRepository.addToStorage(externalBed);
    const execution = useCase.execute(
      {
        locationId: location.id,
        userId: USER.id,
        layouts: [
          { id: externalBed.id, position: { x: 10, y: 10 }, rotation: 0 }
        ]
      },
      USER,
      [CURRENT_VERSION]
    );
    await expect(execution).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws invalid argument exception when two beds in the batch overlap', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id)
    });
    locationRepository.addToStorage(location);

    const bedA = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100)
    });
    const bedB = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100)
    });
    bedRepository.addToStorage(bedA);
    bedRepository.addToStorage(bedB);

    const execution = useCase.execute(
      {
        locationId: location.id,
        userId: USER.id,
        layouts: [
          { id: bedA.id, position: { x: 100, y: 100 }, rotation: 0 },
          { id: bedB.id, position: { x: 120, y: 120 }, rotation: 0 }
        ]
      },
      USER,
      [CURRENT_VERSION]
    );

    await expect(execution).rejects.toBeInstanceOf(InvalidArgumentException);
  });

  it('throws invalid argument exception when a batch bed overlaps an existing omitted placed bed', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id)
    });
    locationRepository.addToStorage(location);

    const existingPlacedBed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100),
      position: { x: 100, y: 100 },
      rotation: 0
    });
    const batchBed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100)
    });
    bedRepository.addToStorage(existingPlacedBed);
    bedRepository.addToStorage(batchBed);

    const execution = useCase.execute(
      {
        locationId: location.id,
        userId: USER.id,
        layouts: [
          { id: batchBed.id, position: { x: 120, y: 120 }, rotation: 0 }
        ]
      },
      USER,
      [CURRENT_VERSION]
    );

    await expect(execution).rejects.toBeInstanceOf(InvalidArgumentException);
  });

  it('places 50 beds well within the 150ms latency budget', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id)
    });
    locationRepository.addToStorage(location);

    const layouts = [];

    for (let i = 0; i < 50; i += 1) {
      const bed = BedFactory.create({
        userId: createUserId(USER.id),
        locationId: location.id,
        width: PositiveNumber.create(100),
        height: PositiveNumber.create(100)
      });
      bedRepository.addToStorage(bed);

      const col = i % 10;
      const row = Math.floor(i / 10);
      layouts.push({
        id: bed.id,
        position: { x: col * 150, y: row * 150 },
        rotation: 0
      });
    }

    const start = performance.now();
    const updatedLocation = await useCase.execute(
      {
        locationId: location.id,
        userId: USER.id,
        layouts
      },
      USER,
      [CURRENT_VERSION]
    );
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(150);
    expect(updatedLocation.version).toBe(CURRENT_VERSION + 1);
    for (let i = 0; i < 50; i += 1) {
      const layout = layouts[i];
      if (!layout) {
        throw new Error(`Missing layout at index ${i}`);
      }
      const col = i % 10;
      const row = Math.floor(i / 10);
      const bed = await bedRepository.findById(layout.id);
      expect(bed?.position).toEqual({ x: col * 150, y: row * 150 });
      expect(bed?.rotation).toBe(0);
    }
  });

  it('throws invalid argument exception when layout input contains duplicate bed ids', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id)
    });
    locationRepository.addToStorage(location);

    const bed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100)
    });
    bedRepository.addToStorage(bed);

    const execution = useCase.execute(
      {
        locationId: location.id,
        userId: USER.id,
        layouts: [
          { id: bed.id, position: { x: 10, y: 10 }, rotation: 0 },
          { id: bed.id, position: { x: 200, y: 200 }, rotation: 0 }
        ]
      },
      USER,
      [CURRENT_VERSION]
    );

    await expect(execution).rejects.toBeInstanceOf(InvalidArgumentException);
  });
});
