import { RemovePlantInstanceBatch } from '../../../../../../src/Contexts/Agro/PlantInstances/application/useCases/RemovePlantInstanceBatch.js';
import { PlantInstanceLifecycleStatus } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/entities/types/index.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { UnitOfWorkMock } from '../../../../shared/__mocks__/UnitOfWorkMock.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../../Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { PlantRepositoryMock } from '../../../Plants/__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { PlantInstanceRepositoryMock } from '../../__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../domain/mothers/PlantInstanceMother.js';

describe('RemovePlantInstanceBatch', () => {
  let bedRepository: BedRepositoryMock;
  let plantRepository: PlantRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let unitOfWork: UnitOfWorkMock;
  let useCase: RemovePlantInstanceBatch;

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
    unitOfWork = new UnitOfWorkMock();

    useCase = new RemovePlantInstanceBatch({
      bedRepository,
      plantInstanceRepository,
      unitOfWork
    });
  });

  it('marks multiple crops in a bed as removed and increments bed version', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop1 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 0
    });
    const crop2 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 1
    });
    plantInstanceRepository.addToStorage(crop1);
    plantInstanceRepository.addToStorage(crop2);

    const input = {
      items: [
        { id: crop1.id, version: 0 },
        { id: crop2.id, version: 1 }
      ]
    };

    await useCase.execute(input, user);

    const storedCrop1 = plantInstanceRepository.getStored(crop1.id);
    const storedCrop2 = plantInstanceRepository.getStored(crop2.id);

    expect(storedCrop1?.instanceStatus).toBe(
      PlantInstanceLifecycleStatus.REMOVED
    );
    expect(storedCrop1?.removedAt).toBeDefined();

    expect(storedCrop2?.instanceStatus).toBe(
      PlantInstanceLifecycleStatus.REMOVED
    );
    expect(storedCrop2?.removedAt).toBeDefined();

    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version + 1);
  });

  it('marks crops as removed and raises bed version inside one unit of work', async () => {
    const bed = BedFactory.fromUser(user);
    bedRepository.addToStorage(bed);

    const plant = PlantFactory.random();
    plantRepository.addToStorage(plant);

    const crop1 = PlantInstanceMother.create({
      bedId: bed.id,
      userId: createUserId(user.id),
      plantId: plant.id,
      version: 0
    });
    plantInstanceRepository.addToStorage(crop1);

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
        items: [{ id: crop1.id, version: 0 }]
      },
      user
    );

    expect(unitOfWork.runCount).toBe(1);
    expect(unitOfWork.tracedCalls).toEqual([
      { name: 'raiseBed', insideUnit: true, unit: 1 },
      { name: 'updateWithDiff', insideUnit: true, unit: 1 }
    ]);
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
    expect(storedCrop?.instanceStatus).toBe(
      PlantInstanceLifecycleStatus.ACTIVE
    );
    expect(storedCrop?.removedAt).toBeUndefined();
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
    expect(storedCrop1?.instanceStatus).toBe(
      PlantInstanceLifecycleStatus.ACTIVE
    );
    expect(storedCrop2?.instanceStatus).toBe(
      PlantInstanceLifecycleStatus.ACTIVE
    );
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
      version: 2
    });
    plantInstanceRepository.addToStorage(crop);

    await expect(
      useCase.execute(
        {
          items: [{ id: crop.id, version: 1 }]
        },
        user
      )
    ).rejects.toThrow(DomainStaleVersionException);

    const storedCrop = plantInstanceRepository.getStored(crop.id);
    expect(storedCrop?.instanceStatus).toBe(
      PlantInstanceLifecycleStatus.ACTIVE
    );
    expect(storedCrop?.removedAt).toBeUndefined();
    const storedBed = await bedRepository.findById(bed.id);
    expect(storedBed?.version).toBe(bed.version);
  });
});
