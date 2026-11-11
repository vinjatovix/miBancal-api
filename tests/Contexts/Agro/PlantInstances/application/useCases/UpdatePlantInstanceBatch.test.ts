import { UpdatePlantInstanceBatch } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/UpdatePlantInstanceBatch.js';
import { CropGrowthStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/CropGrowthStatus.js';
import { CropSpatialService } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainConflictException,
  DomainNotFoundException,
  DomainStaleVersionException,
  InvalidArgumentException
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

describe('UpdatePlantInstanceBatch', () => {
  let bedRepository: BedRepositoryMock;
  let plantRepository: PlantRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let spatialService: CropSpatialService;
  let unitOfWork: UnitOfWorkMock;
  let useCase: UpdatePlantInstanceBatch;

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

    useCase = new UpdatePlantInstanceBatch({
      bedRepository,
      plantRepository,
      plantInstanceRepository,
      cropSpatialService: spatialService,
      unitOfWork
    });
  });

  it('updates details and positions of multiple crops in a bed and increments bed version', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop1 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      position: new Coordinates(20, 20),
      version: 0
    });
    const crop2 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      position: new Coordinates(80, 80),
      version: 1
    });
    plantInstanceRepository.addToStorage(crop1);
    plantInstanceRepository.addToStorage(crop2);

    const input = {
      items: [
        {
          id: crop1.id,
          version: 0,
          position: { x: 25, y: 25 },
          growthStatus: CropGrowthStatus.GROWING,
          variety: 'Beefsteak'
        },
        {
          id: crop2.id,
          version: 1,
          notes: 'Healthy leaves'
        }
      ]
    };

    const results = await useCase.execute(input, user);

    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe(crop1.id);
    expect(results[1]?.id).toBe(crop2.id);

    const storedCrop1 = plantInstanceRepository.getStored(crop1.id);
    expect(storedCrop1?.position).toEqual(new Coordinates(25, 25));
    expect(storedCrop1?.growthStatus).toBe(CropGrowthStatus.GROWING);
    expect(storedCrop1?.variety).toBe('Beefsteak');
    expect(storedCrop1?.version).toBe(1);

    const storedCrop2 = plantInstanceRepository.getStored(crop2.id);
    expect(storedCrop2?.notes).toBe('Healthy leaves');
    expect(storedCrop2?.version).toBe(2);

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version + 1);
  });

  it('updates crops and raises bed version inside one unit of work', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 0
    });
    plantInstanceRepository.addToStorage(crop);

    const raiseBed = unitOfWork.trace(
      'raiseBed',
      bedRepository.conditionalIncrementVersion.bind(bedRepository)
    );
    jest
      .spyOn(bedRepository, 'conditionalIncrementVersion')
      .mockImplementation(raiseBed);

    const updateWithDiff = unitOfWork.trace(
      'updateWithDiff',
      plantInstanceRepository.updateWithDiff.bind(plantInstanceRepository)
    );
    jest
      .spyOn(plantInstanceRepository, 'updateWithDiff')
      .mockImplementation(updateWithDiff);

    await useCase.execute(
      {
        items: [{ id: crop.id, version: 0, notes: 'Updated notes' }]
      },
      user
    );

    expect(unitOfWork.runCount).toBe(1);
    expect(unitOfWork.tracedCalls).toEqual([
      { name: 'raiseBed', insideUnit: true, unit: 1 },
      { name: 'updateWithDiff', insideUnit: true, unit: 1 }
    ]);
  });

  it('allows swapping positions between two batch crops without self-blocking', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop1 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      position: new Coordinates(20, 20),
      version: 0
    });
    const crop2 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      position: new Coordinates(60, 60),
      version: 0
    });
    plantInstanceRepository.addToStorage(crop1);
    plantInstanceRepository.addToStorage(crop2);

    const input = {
      items: [
        { id: crop1.id, version: 0, position: { x: 60, y: 60 } },
        { id: crop2.id, version: 0, position: { x: 20, y: 20 } }
      ]
    };

    const results = await useCase.execute(input, user);

    expect(results[0]?.position).toEqual(new Coordinates(60, 60));
    expect(results[1]?.position).toEqual(new Coordinates(20, 20));

    const storedCrop1 = plantInstanceRepository.getStored(crop1.id);
    const storedCrop2 = plantInstanceRepository.getStored(crop2.id);
    expect(storedCrop1?.position).toEqual(new Coordinates(60, 60));
    expect(storedCrop2?.position).toEqual(new Coordinates(20, 20));
  });

  it('preserves the order of input items in the returned array', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const cropA = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 0
    });
    const cropB = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 0
    });
    plantInstanceRepository.addToStorage(cropB);
    plantInstanceRepository.addToStorage(cropA);

    const input = {
      items: [
        { id: cropA.id, version: 0, notes: 'A' },
        { id: cropB.id, version: 0, notes: 'B' }
      ]
    };

    const results = await useCase.execute(input, user);

    expect(results).toHaveLength(2);
    expect(results[0]?.id).toBe(cropA.id);
    expect(results[1]?.id).toBe(cropB.id);
  });

  it('skips spatial movement validation when no crop position is updated', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      position: new Coordinates(20, 20),
      version: 0
    });
    plantInstanceRepository.addToStorage(crop);

    const spatialSpy = jest.spyOn(spatialService, 'validateBatchMovement');

    const input = {
      items: [
        {
          id: crop.id,
          version: 0,
          growthStatus: CropGrowthStatus.GROWING,
          notes: 'Just notes'
        }
      ]
    };

    await useCase.execute(input, user);

    expect(spatialSpy).not.toHaveBeenCalled();
  });

  it('rejects with DomainNotFoundException if any requested crop is missing', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id
    });
    plantInstanceRepository.addToStorage(crop);

    const missingId = random.uuid();

    await expect(
      useCase.execute(
        {
          items: [
            { id: crop.id, version: 0 },
            { id: missingId, version: 0 }
          ]
        },
        user
      )
    ).rejects.toThrow(DomainNotFoundException);

    const storedCrop = plantInstanceRepository.getStored(crop.id);
    expect(storedCrop?.version).toBe(crop.version);
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('rejects with InvalidArgumentException if crops belong to multiple beds', async () => {
    const bed1 = BedFactory.fromUser(user);
    const bed2 = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed1);
    bedRepository.addToStorage(bed2);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop1 = PlantInstanceMother.create({
      bedId: bed1.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 0
    });
    const crop2 = PlantInstanceMother.create({
      bedId: bed2.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 0
    });
    plantInstanceRepository.addToStorage(crop1);
    plantInstanceRepository.addToStorage(crop2);

    await expect(
      useCase.execute(
        {
          items: [
            { id: crop1.id, version: 0 },
            { id: crop2.id, version: 0 }
          ]
        },
        user
      )
    ).rejects.toThrow(InvalidArgumentException);

    const storedCrop1 = plantInstanceRepository.getStored(crop1.id);
    const storedCrop2 = plantInstanceRepository.getStored(crop2.id);
    expect(storedCrop1?.version).toBe(0);
    expect(storedCrop2?.version).toBe(0);
    const storedBed1 = await bedRepository.findById(bed1.id);
    const storedBed2 = await bedRepository.findById(bed2.id);
    expect(storedBed1?.version).toBe(bed1.version);
    expect(storedBed2?.version).toBe(bed2.version);
  });

  it('rejects with DomainStaleVersionException when a crop version does not match', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 3
    });
    plantInstanceRepository.addToStorage(crop);

    await expect(
      useCase.execute(
        {
          items: [{ id: crop.id, version: 2 }]
        },
        user
      )
    ).rejects.toThrow(DomainStaleVersionException);

    const storedCrop = plantInstanceRepository.getStored(crop.id);
    expect(storedCrop?.version).toBe(3);
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });

  it('rejects with DomainConflictException when relocated crop collides with a fixed neighbor', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const movingCrop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      position: new Coordinates(20, 20),
      version: 0
    });
    const fixedCrop = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      position: new Coordinates(50, 50),
      version: 0
    });
    plantInstanceRepository.addToStorage(movingCrop);
    plantInstanceRepository.addToStorage(fixedCrop);

    const input = {
      items: [{ id: movingCrop.id, version: 0, position: { x: 50.1, y: 50 } }]
    };

    await expect(useCase.execute(input, user)).rejects.toThrow(
      DomainConflictException
    );

    const storedMovingCrop = plantInstanceRepository.getStored(movingCrop.id);
    expect(storedMovingCrop?.position).toEqual(new Coordinates(20, 20));
    expect(storedMovingCrop?.version).toBe(0);

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });
});
