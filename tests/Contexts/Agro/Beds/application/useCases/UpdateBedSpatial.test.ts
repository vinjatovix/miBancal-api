import { UpdateBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/UpdateBed.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../../Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../Locations/domain/mothers/LocationFactory.js';
import { PlantInstanceRepositoryMock } from '../../../PlantInstances/__mocks__/PlantInstanceRepositoryMock.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('UpdateBed Spatial Placement', () => {
  const CURRENT_VERSION = 0;
  let repository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let locationRepository: LocationRepositoryMock;
  let useCase: UpdateBed;

  const USER: UserSessionInfo = {
    username: 'spatial-gardener',
    id: random.uuid(),
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    repository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    locationRepository = new LocationRepositoryMock();
    useCase = new UpdateBed({
      bedRepository: repository,
      plantInstanceRepository,
      locationRepository
    });
  });

  it('places a bed within canvas boundaries and calculates net orientation', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id),
      northAngle: 45,
      canvasWidth: 2000,
      canvasHeight: 1500
    });
    locationRepository.addToStorage(location);

    const bed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(200)
    });
    repository.addToStorage(bed);

    const { bed: updated } = await useCase.execute(
      {
        id: bed.id,
        position: { x: 300, y: 150 },
        rotation: 90
      },
      USER,
      [CURRENT_VERSION]
    );

    expect(updated.position).toEqual({ x: 300, y: 150 });
    expect(updated.rotation).toBe(90);
    expect(updated.netOrientation).toBe(135);
  });

  it('increments parent location version when bed is placed', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id),
      canvasWidth: 2000,
      canvasHeight: 1500
    });
    locationRepository.addToStorage(location);

    const bed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(200)
    });
    repository.addToStorage(bed);

    await useCase.execute(
      {
        id: bed.id,
        position: { x: 100, y: 100 },
        rotation: 0
      },
      USER,
      [CURRENT_VERSION]
    );

    const savedLocation = await locationRepository.findOwnedActiveById(
      location.id,
      USER.id
    );
    expect(savedLocation?.version).toBe(location.version + 1);
  });

  it('unplaces a placed bed when position is explicitly set to null', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id)
    });
    locationRepository.addToStorage(location);

    const bed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      position: { x: 100, y: 100 },
      rotation: 0
    });
    repository.addToStorage(bed);

    const { bed: updated } = await useCase.execute(
      {
        id: bed.id,
        position: null
      },
      USER,
      [CURRENT_VERSION]
    );

    expect(updated.position).toBeUndefined();
    expect(updated.rotation).toBeUndefined();
    expect(updated.netOrientation).toBeUndefined();

    const savedLocation = await locationRepository.findOwnedActiveById(
      location.id,
      USER.id
    );
    expect(savedLocation?.version).toBe(location.version + 1);
  });

  it('throws an invalid argument exception when setting rotation on an unplaced bed without providing position', async () => {
    const bed = BedFactory.create({
      userId: createUserId(USER.id),
      position: undefined,
      rotation: undefined
    });
    repository.addToStorage(bed);

    const execution = useCase.execute(
      {
        id: bed.id,
        rotation: 90
      },
      USER,
      [CURRENT_VERSION]
    );

    await expect(execution).rejects.toBeInstanceOf(InvalidArgumentException);
  });

  it('throws an invalid argument exception when bed exceeds canvas boundaries', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id),
      canvasWidth: 500,
      canvasHeight: 500
    });
    locationRepository.addToStorage(location);

    const bed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(200),
      height: PositiveNumber.create(300)
    });
    repository.addToStorage(bed);

    const execution = useCase.execute(
      {
        id: bed.id,
        position: { x: 400, y: 100 },
        rotation: 0
      },
      USER,
      [CURRENT_VERSION]
    );

    await expect(execution).rejects.toBeInstanceOf(InvalidArgumentException);
  });

  it('throws a domain conflict exception when bed collides with an existing placed bed in the same location', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id),
      canvasWidth: 2000,
      canvasHeight: 2000
    });
    locationRepository.addToStorage(location);

    const existingBed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(200),
      height: PositiveNumber.create(100),
      position: { x: 100, y: 100 },
      rotation: 0
    });
    repository.addToStorage(existingBed);

    const newBed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(200),
      height: PositiveNumber.create(100)
    });
    repository.addToStorage(newBed);

    const execution = useCase.execute(
      {
        id: newBed.id,
        position: { x: 150, y: 120 },
        rotation: 0
      },
      USER,
      [CURRENT_VERSION]
    );

    await expect(execution).rejects.toBeInstanceOf(DomainConflictException);
  });

  it('does not detect collision with itself when re-positioning an already placed bed', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER.id),
      canvasWidth: 2000,
      canvasHeight: 2000
    });
    locationRepository.addToStorage(location);

    const bed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100),
      position: { x: 100, y: 100 },
      rotation: 0
    });
    repository.addToStorage(bed);

    const { bed: updated } = await useCase.execute(
      {
        id: bed.id,
        position: { x: 120, y: 120 },
        rotation: 0
      },
      USER,
      [CURRENT_VERSION]
    );

    expect(updated.position).toEqual({ x: 120, y: 120 });
  });

  it('throws not found exception when bed location does not exist', async () => {
    const nonExistentLocationId = random.uuid();
    const bed = BedFactory.create({
      userId: createUserId(USER.id),
      locationId: nonExistentLocationId,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100)
    });
    repository.addToStorage(bed);

    const execution = useCase.execute(
      {
        id: bed.id,
        position: { x: 100, y: 100 },
        rotation: 0
      },
      USER,
      [CURRENT_VERSION]
    );

    await expect(execution).rejects.toBeInstanceOf(DomainNotFoundException);
  });
});
