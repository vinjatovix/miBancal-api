import { CreateBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/CreateBed.js';
import { bedInputMapper } from '../../../../../../src/Contexts/Agro/Beds/mappers/bedInputMapper.js';
import { createLocationId } from '../../../../../../src/Contexts/Agro/Locations/domain/LocationId.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../../Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../Locations/domain/mothers/LocationFactory.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';

describe('CreateBed', () => {
  let repository: BedRepositoryMock;
  let locationRepository: LocationRepositoryMock;
  let useCase: CreateBed;
  const USER_NAME = random.name();
  const USER_ID = random.uuid();
  const BED_NAME = 'Test Bed';

  const BED_UUID = random.uuid();
  const LOCATION_UUID = random.uuid();
  const input = {
    id: BED_UUID,
    userId: USER_ID,
    locationId: LOCATION_UUID,
    name: BED_NAME,
    width: 100,
    height: 200,
    depth: 30
  };

  beforeEach((): void => {
    repository = new BedRepositoryMock();
    locationRepository = new LocationRepositoryMock();
    const defaultLocation = LocationFactory.domainBase({
      id: createLocationId(LOCATION_UUID),
      userId: createUserId(USER_ID)
    });
    locationRepository.addToStorage(defaultLocation);
    useCase = new CreateBed({
      bedRepository: repository,
      locationRepository
    });
  });

  it('should throw conflict if bed already exists', async () => {
    const bed = bedInputMapper.fromCreateInputToDomain(input, USER_NAME);
    repository.addToStorage(bed);

    await expect(useCase.execute(input, USER_NAME)).rejects.toThrow(
      new DomainConflictException(`Bed already exists: ${input.id}`)
    );

    repository.assertSaveNotCalled();
  });

  it('should save bed in repository with locationId', async () => {
    await useCase.execute(input, USER_NAME);

    repository.assertSaveCalled();
    expect(repository.getStored(input.id)?.locationId).toBe(LOCATION_UUID);
  });

  it('should return created bed with locationId', async () => {
    const result = await useCase.execute(input, USER_NAME);

    expect(result.id).toBe(BED_UUID);
    expect(result.userId).toBe(USER_ID);
    expect(result.locationId).toBe(LOCATION_UUID);
    expect(result.width.value).toBe(input.width);
    expect(result.height.value).toBe(input.height);
    expect(result.depth.value).toBe(input.depth);
  });

  it('should reject creation when locationId is missing', async () => {
    const { locationId: _locationId, ...invalidInput } = input;

    await expect(
      useCase.execute(invalidInput as typeof input, USER_NAME)
    ).rejects.toThrow(InvalidArgumentException);

    repository.assertSaveNotCalled();
  });

  it('should have no geographic context when location has no coordinates', async () => {
    const noGeoLocation = LocationFactory.domainBase({
      userId: createUserId(USER_ID),
      latitude: undefined,
      longitude: undefined
    });
    locationRepository.addToStorage(noGeoLocation);

    const result = await useCase.execute(
      { ...input, locationId: noGeoLocation.id },
      USER_NAME
    );

    expect(result.locationId).toBe(noGeoLocation.id);
    expect(result.latitude).toBeUndefined();
    expect(result.longitude).toBeUndefined();
  });

  it('should snapshot the resolved location coordinates', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER_ID),
      latitude: 40.4168,
      longitude: -3.7038
    });
    locationRepository.addToStorage(location);

    const result = await useCase.execute(
      { ...input, locationId: location.id },
      USER_NAME
    );

    expect(result.locationId).toBe(location.id);
    expect(result.latitude).toBe(40.4168);
    expect(result.longitude).toBe(-3.7038);
  });

  it('should reject an unknown locationId before persisting the bed', async () => {
    const unknownLocationId = random.uuid();

    await expect(
      useCase.execute({ ...input, locationId: unknownLocationId }, USER_NAME)
    ).rejects.toThrow(DomainNotFoundException);

    repository.assertSaveNotCalled();
  });

  it('should reject a non-owned locationId before persisting the bed', async () => {
    const location = LocationFactory.domainBase({});
    locationRepository.addToStorage(location);

    await expect(
      useCase.execute(
        { ...input, userId: random.uuid(), locationId: location.id },
        USER_NAME
      )
    ).rejects.toThrow(DomainNotFoundException);

    repository.assertSaveNotCalled();
  });

  it('should call exists with the bed id', async () => {
    await useCase.execute(input, USER_NAME);

    repository.assertExistsCalledWith(input.id);
  });
});
