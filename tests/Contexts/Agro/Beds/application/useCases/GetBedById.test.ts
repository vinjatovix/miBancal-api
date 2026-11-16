import { GetBedById } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/GetBedById.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../../Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../Locations/domain/mothers/LocationFactory.js';
import { PlantInstanceRepositoryMock } from '../../../PlantInstances/__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('GetBedById', () => {
  let repository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let locationRepository: LocationRepositoryMock;
  let useCase: GetBedById;

  beforeEach(() => {
    repository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    locationRepository = new LocationRepositoryMock();
    useCase = new GetBedById({
      bedRepository: repository,
      plantInstanceRepository,
      locationRepository
    });
  });

  it('should search the active bed owned by the user and list its crop ids', async () => {
    const bed = BedFactory.create();
    repository.addToStorage(bed);
    const user = {
      username: 'test-user',
      id: bed.userId,
      email: 'test-user@example.com',
      roles: ['user']
    };

    const crop = PlantInstanceMother.create({
      userId: bed.userId,
      bedId: bed.id
    });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(bed.id, user);

    expect(result.bed.id).toBe(bed.id);
    expect(result.cropIds).toEqual([crop.id]);
    expect(result.crops).toBeUndefined();
    repository.assertFindOwnedActiveByIdHasBeenCalledWith(bed.id, bed.userId);
  });

  it('should list only the crop ids when embedding is explicitly off', async () => {
    const bed = BedFactory.create();
    repository.addToStorage(bed);
    const user = {
      username: 'test-user',
      id: bed.userId,
      email: 'test-user@example.com',
      roles: ['user']
    };
    const crop = PlantInstanceMother.create({
      userId: bed.userId,
      bedId: bed.id
    });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(bed.id, user, { embedCrops: false });

    expect(result.cropIds).toEqual([crop.id]);
    expect(result.crops).toBeUndefined();
  });

  it('should load the full crops when asked to embed them', async () => {
    const bed = BedFactory.create();
    repository.addToStorage(bed);
    const user = {
      username: 'test-user',
      id: bed.userId,
      email: 'test-user@example.com',
      roles: ['user']
    };
    const crop = PlantInstanceMother.create({
      userId: bed.userId,
      bedId: bed.id
    });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(bed.id, user, { embedCrops: true });

    expect(result.cropIds).toEqual([crop.id]);
    expect(result.crops?.map((c) => c.id)).toEqual([crop.id]);
  });

  it('should throw not found error when bed does not exist', async () => {
    const id = random.uuid();
    const user = {
      username: 'test-user',
      id: random.uuid(),
      email: 'test-user@example.com',
      roles: ['user']
    };

    await expect(useCase.execute(id, user)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('should throw not found error when user is not the creator of the bed', async () => {
    const bed = BedFactory.create();
    repository.addToStorage(bed);
    const otherUser = {
      username: 'other-user',
      id: random.uuid(),
      email: 'other-user@example.com',
      roles: ['user']
    };

    await expect(useCase.execute(bed.id, otherUser)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('should throw not found error when bed is soft-deleted', async () => {
    const userId = random.uuid();
    const user = {
      username: 'test-user',
      id: userId,
      email: 'test-user@example.com',
      roles: ['user']
    };
    const bed = BedFactory.create({
      deleted: true,
      deletedAt: new Date(),
      userId: createUserId(userId)
    });
    repository.addToStorage(bed);

    await expect(useCase.execute(bed.id, user)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });

  it('should embed location details when embedLocation is true', async () => {
    const userId = random.uuid();
    const location = LocationFactory.domainBase({
      userId: createUserId(userId),
      name: 'Finca Get',
      latitude: 40.4168,
      longitude: -3.7038
    });
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({
      userId: createUserId(userId),
      locationId: location.id
    });
    repository.addToStorage(bed);
    const user = {
      username: 'test-user',
      id: userId,
      email: 'test@example.com',
      roles: ['user']
    };

    const result = await useCase.execute(bed.id, user, {
      embedCrops: false,
      embedLocation: true
    });

    expect(result.location).toEqual({
      id: location.id,
      name: 'Finca Get',
      latitude: 40.4168,
      longitude: -3.7038
    });
  });

  it('should embed location as null when location is soft-deleted', async () => {
    const userId = random.uuid();
    const location = LocationFactory.domainBase({
      userId: createUserId(userId),
      status: 'deleted',
      deletedAt: new Date()
    });
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({
      userId: createUserId(userId),
      locationId: location.id
    });
    repository.addToStorage(bed);
    const user = {
      username: 'test-user',
      id: userId,
      email: 'test@example.com',
      roles: ['user']
    };

    const result = await useCase.execute(bed.id, user, {
      embedCrops: false,
      embedLocation: true
    });

    expect(result.location).toBeNull();
  });
});
