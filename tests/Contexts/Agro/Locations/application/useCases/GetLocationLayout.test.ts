import { GetLocationLayout } from '../../../../../../src/Contexts/Agro/Locations/application/useCases/GetLocationLayout.js';
import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../../Beds/__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../../Beds/domain/mothers/BedFactory.js';
import { PlantInstanceRepositoryMock } from '../../../PlantInstances/__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { PlantRelationRepositoryMock } from '../../../PlantRelations/__mocks__/PlantRelationRepositoryMock.js';
import { PlantRelationMother } from '../../../PlantRelations/domain/mothers/PlantRelationMother.js';
import { PlantRepositoryMock } from '../../../Plants/__mocks__/PlantRepositoryMock.js';
import { PlantFactory } from '../../../Plants/domain/mothers/PlantFactory.js';
import { LocationRepositoryMock } from '../../__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../domain/mothers/LocationFactory.js';

describe('GetLocationLayout', () => {
  let locationRepository: LocationRepositoryMock;
  let bedRepository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let plantRepository: PlantRepositoryMock;
  let plantRelationRepository: PlantRelationRepositoryMock;
  let useCase: GetLocationLayout;

  const USER_ID = random.uuid();

  beforeEach(() => {
    locationRepository = new LocationRepositoryMock();
    bedRepository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    plantRepository = new PlantRepositoryMock();
    plantRelationRepository = new PlantRelationRepositoryMock();
    useCase = new GetLocationLayout({
      locationRepository,
      bedRepository,
      plantInstanceRepository,
      plantRepository,
      plantRelationRepository
    });
  });

  it('partitions placed and unplaced beds correctly', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER_ID),
      northAngle: 45
    });
    locationRepository.addToStorage(location);

    const placedBed = BedFactory.create({
      userId: createUserId(USER_ID),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(200),
      position: { x: 50, y: 50 },
      rotation: 90
    });
    const unplacedBed = BedFactory.create({
      userId: createUserId(USER_ID),
      locationId: location.id,
      width: PositiveNumber.create(120),
      height: PositiveNumber.create(240)
    });
    bedRepository.addToStorage(placedBed);
    bedRepository.addToStorage(unplacedBed);

    const layout = await useCase.execute(location.id, USER_ID);

    expect(layout.location.id).toBe(location.id);
    expect(layout.location.northAngle).toBe(45);

    expect(layout.placedBeds).toHaveLength(1);
    expect(layout.placedBeds[0]?.id).toBe(placedBed.id);
    expect(layout.placedBeds[0]?.position).toEqual({ x: 50, y: 50 });
    expect(layout.placedBeds[0]?.rotation).toBe(90);
    expect(layout.placedBeds[0]?.netOrientation).toBe(135);

    expect(layout.unplacedBeds).toHaveLength(1);
    expect(layout.unplacedBeds[0]?.id).toBe(unplacedBed.id);
    expect(layout.unplacedBeds[0]?.position).toBeNull();
    expect(layout.unplacedBeds[0]?.rotation).toBe(0);
    expect(layout.companionGraph).toEqual([]);
  });

  it('evaluates cross-bed companion edges while strictly excluding crops in unplaced beds', async () => {
    const location = LocationFactory.domainBase({
      userId: createUserId(USER_ID),
      northAngle: 0
    });
    locationRepository.addToStorage(location);

    const placedBedA = BedFactory.create({
      userId: createUserId(USER_ID),
      locationId: location.id,
      width: PositiveNumber.create(120),
      height: PositiveNumber.create(200),
      position: { x: 0, y: 0 },
      rotation: 0
    });
    const placedBedB = BedFactory.create({
      userId: createUserId(USER_ID),
      locationId: location.id,
      width: PositiveNumber.create(120),
      height: PositiveNumber.create(200),
      position: { x: 160, y: 0 },
      rotation: 0
    });
    const unplacedBed = BedFactory.create({
      userId: createUserId(USER_ID),
      locationId: location.id,
      width: PositiveNumber.create(100),
      height: PositiveNumber.create(100)
    });
    bedRepository.addToStorage(placedBedA);
    bedRepository.addToStorage(placedBedB);
    bedRepository.addToStorage(unplacedBed);

    const plantMarigold = PlantFactory.create();
    const plantTomato = PlantFactory.create();
    plantRepository.addToStorage(plantMarigold);
    plantRepository.addToStorage(plantTomato);

    const beneficialRule = PlantRelationMother.beneficial(
      plantMarigold.id,
      plantTomato.id,
      {
        proximity: ProximityDistance.create(0, 100),
        reason: 'Pest repellent synergy across beds'
      }
    );
    plantRelationRepository.populate([beneficialRule]);

    const marigoldInBedA = PlantInstanceMother.atPosition(110, 50, {
      userId: createUserId(USER_ID),
      bedId: placedBedA.id,
      plantId: plantMarigold.id
    });
    const tomatoInBedB = PlantInstanceMother.atPosition(10, 50, {
      userId: createUserId(USER_ID),
      bedId: placedBedB.id,
      plantId: plantTomato.id
    });
    const marigoldInUnplacedBed = PlantInstanceMother.atPosition(50, 50, {
      userId: createUserId(USER_ID),
      bedId: unplacedBed.id,
      plantId: plantMarigold.id
    });
    plantInstanceRepository.addToStorage(marigoldInBedA);
    plantInstanceRepository.addToStorage(tomatoInBedB);
    plantInstanceRepository.addToStorage(marigoldInUnplacedBed);

    const layout = await useCase.execute(location.id, USER_ID);

    expect(layout.placedBeds).toHaveLength(2);
    expect(layout.unplacedBeds).toHaveLength(1);
    expect(layout.companionGraph).toHaveLength(1);
    expect(layout.companionGraph[0]).toEqual(
      expect.objectContaining({
        sourcePlantInstanceId: marigoldInBedA.id,
        targetPlantInstanceId: tomatoInBedB.id,
        sourceBedId: placedBedA.id,
        targetBedId: placedBedB.id,
        scope: 'cross_bed',
        distanceCm: 60,
        relationType: 'beneficial'
      })
    );
  });

  it('throws not found exception when location does not exist', async () => {
    const execution = useCase.execute(random.uuid(), USER_ID);

    await expect(execution).rejects.toBeInstanceOf(DomainNotFoundException);
  });
});
