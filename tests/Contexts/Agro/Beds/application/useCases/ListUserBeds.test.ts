import { ListUserBeds } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/ListUserBeds.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { random } from '../../../../shared/fixtures/random.js';
import { LocationRepositoryMock } from '../../../Locations/__mocks__/LocationRepositoryMock.js';
import { LocationFactory } from '../../../Locations/domain/mothers/LocationFactory.js';
import { PlantInstanceRepositoryMock } from '../../../PlantInstances/__mocks__/PlantInstanceRepositoryMock.js';
import { PlantInstanceMother } from '../../../PlantInstances/domain/mothers/PlantInstanceMother.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('ListUserBeds', () => {
  let repository: BedRepositoryMock;
  let plantInstanceRepository: PlantInstanceRepositoryMock;
  let locationRepository: LocationRepositoryMock;
  let useCase: ListUserBeds;

  beforeEach(() => {
    repository = new BedRepositoryMock();
    plantInstanceRepository = new PlantInstanceRepositoryMock();
    locationRepository = new LocationRepositoryMock();
    useCase = new ListUserBeds({
      bedRepository: repository,
      plantInstanceRepository,
      locationRepository
    });
  });

  it('should call repository.findByUser and batch resolve crops', async () => {
    const userId = randomUserId();
    const bed1 = BedFactory.create({ userId });
    const bed2 = BedFactory.create({ userId });
    repository.addToStorage(bed1);
    repository.addToStorage(bed2);

    const crop1 = PlantInstanceMother.create({ userId, bedId: bed1.id });
    const crop2 = PlantInstanceMother.create({ userId, bedId: bed2.id });
    plantInstanceRepository.addToStorage(crop1);
    plantInstanceRepository.addToStorage(crop2);

    const result = await useCase.execute(userId);

    expect(result.map(({ bed, cropIds }) => [bed.id, cropIds])).toEqual(
      expect.arrayContaining([
        [bed1.id, [crop1.id]],
        [bed2.id, [crop2.id]]
      ])
    );
    expect(result.every(({ crops }) => crops === undefined)).toBe(true);
  });

  it('should list only the crop ids when embedding is explicitly off', async () => {
    const userId = randomUserId();
    const bed = BedFactory.create({ userId });
    repository.addToStorage(bed);
    const crop = PlantInstanceMother.create({ userId, bedId: bed.id });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(userId, undefined, {
      embedCrops: false
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.bed.id).toBe(bed.id);
    expect(result[0]?.cropIds).toEqual([crop.id]);
    expect(result[0]?.crops).toBeUndefined();
  });

  it('should embed each bed its own full crops when asked to', async () => {
    const userId = randomUserId();
    const bed1 = BedFactory.create({ userId });
    const bed2 = BedFactory.create({ userId });
    repository.addToStorage(bed1);
    repository.addToStorage(bed2);
    const crop1 = PlantInstanceMother.create({ userId, bedId: bed1.id });
    plantInstanceRepository.addToStorage(crop1);

    const result = await useCase.execute(userId, undefined, {
      embedCrops: true
    });

    const byBed = new Map(result.map(({ bed, crops }) => [bed.id, crops]));
    expect(byBed.get(bed1.id)?.map((c) => c.id)).toEqual([crop1.id]);
    expect(byBed.get(bed2.id)).toEqual([]);
  });

  it('should filter beds by locationId when filter is provided', async () => {
    const userId = randomUserId();
    const locationId = random.uuid();
    const findByUserSpy = jest
      .spyOn(repository, 'findByUserId')
      .mockResolvedValue([]);

    await useCase.execute(userId, { locationId });

    expect(findByUserSpy).toHaveBeenCalledWith(userId, { locationId });
  });

  it('should embed location details when embedLocation is true', async () => {
    const userId = randomUserId();
    const location = LocationFactory.domainBase({
      userId,
      name: 'Parcela Este',
      latitude: 40.4168,
      longitude: -3.7038
    });
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({ userId, locationId: location.id });
    repository.addToStorage(bed);

    const result = await useCase.execute(userId, undefined, {
      embedCrops: false,
      embedLocation: true
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.location).toEqual({
      id: location.id,
      name: 'Parcela Este',
      latitude: 40.4168,
      longitude: -3.7038
    });
  });

  it('should embed both crops and location when both options are set', async () => {
    const userId = randomUserId();
    const location = LocationFactory.domainBase({
      userId,
      name: 'Finca Total'
    });
    locationRepository.addToStorage(location);
    const bed = BedFactory.create({ userId, locationId: location.id });
    repository.addToStorage(bed);
    const crop = PlantInstanceMother.create({ userId, bedId: bed.id });
    plantInstanceRepository.addToStorage(crop);

    const result = await useCase.execute(userId, undefined, {
      embedCrops: true,
      embedLocation: true
    });

    expect(result[0]?.crops).toHaveLength(1);
    expect(result[0]?.location?.name).toBe('Finca Total');
  });

  it('should return an empty list without loading crops when the user has no beds', async () => {
    const result = await useCase.execute(randomUserId());

    expect(result).toEqual([]);
  });
});
