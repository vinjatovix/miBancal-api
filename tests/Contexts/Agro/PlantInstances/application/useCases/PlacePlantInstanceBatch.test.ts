import { PlacePlantInstanceBatch } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/PlacePlantInstanceBatch.js';
import { CropGrowthStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/CropGrowthStatus.js';
import { CropSpatialService } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  DomainNotFoundException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Coordinates } from '../../../../../../src/shared/domain/value-objects/Coordinates.js';
import { UnitOfWorkMock } from '../../../../shared/__mocks__/UnitOfWorkMock.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../../Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { PlantRepositoryMock } from '../../../Plants/__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { PlantInstanceRepositoryMock } from '../../__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

describe('PlacePlantInstanceBatch', () => {
  let bedRepository: BedRepositoryMock;
  let plantRepository: PlantRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let spatialService: CropSpatialService;
  let unitOfWork: UnitOfWorkMock;
  let useCase: PlacePlantInstanceBatch;

  const user: UserSessionInfo = {
    id: random.uuid(),
    username: 'gardener',
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    bedRepository = new BedRepositoryMock();
    plantRepository = new PlantRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    spatialService = new CropSpatialService();
    unitOfWork = new UnitOfWorkMock();

    useCase = new PlacePlantInstanceBatch({
      bedRepository,
      plantRepository,
      plantInstanceRepository,
      cropSpatialService: spatialService,
      unitOfWork
    });
  });

  it('places multiple crops in a bed successfully and increments the bed version', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const cropId1 = random.uuid();
    const cropId2 = random.uuid();

    const input = {
      bedId: bed.id,
      items: [
        {
          id: cropId1,
          plantId: plant.id,
          position: { x: 20, y: 20 },
          growthStatus: CropGrowthStatus.SEEDED,
          variety: 'Cherry',
          notes: 'Row 1'
        },
        {
          id: cropId2,
          plantId: plant.id,
          position: { x: 80, y: 80 },
          growthStatus: CropGrowthStatus.PLANTED
        }
      ]
    };

    const results = await useCase.execute(input, user);

    expect(results).toHaveLength(2);

    const storedCrop1 = plantInstanceRepository.getStored(cropId1);
    expect(storedCrop1).toMatchObject({
      id: cropId1,
      bedId: bed.id,
      plantId: plant.id,
      userId: user.id,
      position: new Coordinates(20, 20),
      growthStatus: CropGrowthStatus.SEEDED,
      variety: 'Cherry',
      notes: 'Row 1',
      version: 0
    });

    const storedCrop2 = plantInstanceRepository.getStored(cropId2);
    expect(storedCrop2).toMatchObject({
      id: cropId2,
      bedId: bed.id,
      plantId: plant.id,
      userId: user.id,
      position: new Coordinates(80, 80),
      growthStatus: CropGrowthStatus.PLANTED,
      version: 0
    });
    expect(storedCrop2?.variety).toBeUndefined();
    expect(storedCrop2?.notes).toBeUndefined();

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version + 1);
  });

  it('persists all crops and raises the bed version atomically inside a single unit of work', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const raiseBed = unitOfWork.trace(
      'raiseBed',
      bedRepository.conditionalIncrementVersion.bind(bedRepository)
    );
    jest
      .spyOn(bedRepository, 'conditionalIncrementVersion')
      .mockImplementation(raiseBed);

    const saveMany = unitOfWork.trace(
      'saveMany',
      plantInstanceRepository.saveMany.bind(plantInstanceRepository)
    );
    jest
      .spyOn(plantInstanceRepository, 'saveMany')
      .mockImplementation(saveMany);

    await useCase.execute(
      {
        bedId: bed.id,
        items: [
          { id: random.uuid(), plantId: plant.id },
          { id: random.uuid(), plantId: plant.id }
        ]
      },
      user
    );

    expect(unitOfWork.runCount).toBe(1);
    expect(unitOfWork.tracedCalls).toEqual([
      { name: 'raiseBed', insideUnit: true, unit: 1 },
      { name: 'saveMany', insideUnit: true, unit: 1 }
    ]);
  });

  it('rejects with DomainNotFoundException if target bed is not found', async () => {
    const unknownBedId = random.uuid();

    await expect(
      useCase.execute(
        {
          bedId: unknownBedId,
          items: [{ id: random.uuid(), plantId: random.uuid() }]
        },
        user
      )
    ).rejects.toThrow(DomainNotFoundException);
  });

  it('rejects with DomainNotFoundException if any plantId is not in the catalog', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const existingPlant = PlantFactory.random();
    plantRepository.addToStorage(existingPlant);
    const missingPlantId = random.uuid();

    await expect(
      useCase.execute(
        {
          bedId: bed.id,
          items: [
            { id: random.uuid(), plantId: existingPlant.id },
            { id: random.uuid(), plantId: missingPlantId }
          ]
        },
        user
      )
    ).rejects.toThrow(DomainNotFoundException);

    expect(plantInstanceRepository.saveManyCalls).toHaveLength(0);
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('rejects with DomainConflictException when two crops in the batch collide internally', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const input = {
      bedId: bed.id,
      items: [
        {
          id: random.uuid(),
          plantId: plant.id,
          position: { x: 50, y: 50 }
        },
        {
          id: random.uuid(),
          plantId: plant.id,
          position: { x: 50.1, y: 50 }
        }
      ]
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainConflictException
    );

    expect(plantInstanceRepository.saveManyCalls).toHaveLength(0);
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('rejects with DomainConflictException when a batch crop collides with an existing bed crop', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const existingCrop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      position: new Coordinates(50, 50)
    });
    plantInstanceRepository.addToStorage(existingCrop);

    const input = {
      bedId: bed.id,
      items: [
        {
          id: random.uuid(),
          plantId: plant.id,
          position: { x: 50.5, y: 50 }
        }
      ]
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainConflictException
    );

    expect(plantInstanceRepository.saveManyCalls).toHaveLength(0);
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('rejects with DomainConflictException when a batch crop is out of bed bounds', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const input = {
      bedId: bed.id,
      items: [
        {
          id: random.uuid(),
          plantId: plant.id,
          position: { x: bed.width.value + 10, y: 50 }
        }
      ]
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainConflictException
    );

    expect(plantInstanceRepository.saveManyCalls).toHaveLength(0);
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });
});
