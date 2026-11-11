import { beforeEach, describe, expect, it } from '@jest/globals';

import { createBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { validatePlantInstanceBatch } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/validatePlantInstanceBatch.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../../Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { PlantInstanceRepositoryMock } from '../../__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

describe('validatePlantInstanceBatch', () => {
  let bedRepository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;

  const userId = random.uuid();
  const user = {
    id: userId,
    username: 'gardener',
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    bedRepository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
  });

  it('validates batch items successfully returning bed, foundCrops and cropsMap', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    const crop1 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(userId),
      plantId: plant.id,
      version: 0
    });
    const crop2 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(userId),
      plantId: plant.id,
      version: 1
    });
    plantInstanceRepository.addToStorage(crop1);
    plantInstanceRepository.addToStorage(crop2);

    const result = await validatePlantInstanceBatch({
      items: [
        { id: crop1.id, version: 0 },
        { id: crop2.id, version: 1 }
      ],
      userId,
      plantInstanceRepository,
      bedRepository
    });

    expect(result.bed.id).toBe(bed.id);
    expect(result.foundCrops).toHaveLength(2);
    expect(result.cropsMap.get(crop1.id)).toBe(crop1);
    expect(result.cropsMap.get(crop2.id)).toBe(crop2);
  });

  it('throws DomainNotFoundException when any requested plant instance is missing or not owned', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    const crop1 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(userId),
      plantId: plant.id,
      version: 0
    });
    plantInstanceRepository.addToStorage(crop1);
    const missingId = random.uuid();

    const validateAction = validatePlantInstanceBatch({
      items: [
        { id: crop1.id, version: 0 },
        { id: missingId, version: 0 }
      ],
      userId,
      plantInstanceRepository,
      bedRepository
    });

    await expect(validateAction).rejects.toThrow(DomainNotFoundException);
  });

  it('throws InvalidArgumentException when items in batch belong to different beds', async () => {
    const bedA = BedFactory.fromUser(user);
    const bedB = BedFactory.fromUser(user);
    bedRepository.addToStorage(bedA);
    bedRepository.addToStorage(bedB);

    const plant = PlantFactory.random();
    const cropA = PlantInstanceMother.create({
      bedId: bedA.id,
      userId: createUserId(userId),
      plantId: plant.id,
      version: 0
    });
    const cropB = PlantInstanceMother.create({
      bedId: bedB.id,
      userId: createUserId(userId),
      plantId: plant.id,
      version: 0
    });
    plantInstanceRepository.addToStorage(cropA);
    plantInstanceRepository.addToStorage(cropB);

    const validateAction = validatePlantInstanceBatch({
      items: [
        { id: cropA.id, version: 0 },
        { id: cropB.id, version: 0 }
      ],
      userId,
      plantInstanceRepository,
      bedRepository
    });

    await expect(validateAction).rejects.toThrow(InvalidArgumentException);
  });

  it('throws DomainNotFoundException when target bed is not found or not owned', async () => {
    const plant = PlantFactory.random();
    const missingBedId = createBedId(random.uuid());
    const crop = PlantInstanceMother.create({
      bedId: missingBedId,
      userId: createUserId(userId),
      plantId: plant.id,
      version: 0
    });
    plantInstanceRepository.addToStorage(crop);

    const validateAction = validatePlantInstanceBatch({
      items: [{ id: crop.id, version: 0 }],
      userId,
      plantInstanceRepository,
      bedRepository
    });

    await expect(validateAction).rejects.toThrow(DomainNotFoundException);
  });

  it('throws DomainStaleVersionException when item version does not match crop version', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    const crop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(userId),
      plantId: plant.id,
      version: 2
    });
    plantInstanceRepository.addToStorage(crop);

    const validateAction = validatePlantInstanceBatch({
      items: [{ id: crop.id, version: 1 }],
      userId,
      plantInstanceRepository,
      bedRepository
    });

    await expect(validateAction).rejects.toThrow(DomainStaleVersionException);
  });

  it('throws InvalidArgumentException when batch items contain duplicate ids', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    const crop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(userId),
      plantId: plant.id,
      version: 0
    });
    plantInstanceRepository.addToStorage(crop);

    const validateAction = validatePlantInstanceBatch({
      items: [
        { id: crop.id, version: 0 },
        { id: crop.id, version: 0 }
      ],
      userId,
      plantInstanceRepository,
      bedRepository
    });

    await expect(validateAction).rejects.toThrow(InvalidArgumentException);
  });
});
