import { GetPlant } from '../../../../../../src/Contexts/Agro/Plants/application/useCases/GetPlant.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { catalogIdKey } from '../../../../../../src/Contexts/shared/application/cache/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { CacheRepositoryFake } from '../../../../shared/__mocks__/CacheRepositoryFake.js';
import { random } from '../../../../shared/fixtures/random.js';
import { FamilySummaryReaderMock } from '../../__mocks__/FamilySummaryReaderMock.js';
import { PlantLikesCounterReaderFake } from '../../__mocks__/PlantLikesCounterReaderFake.js';
import { PlantReadRepositoryMock } from '../../__mocks__/PlantReadRepositoryMock.js';
import { FamilySummaryViewMother } from '../queries/FamilySummaryViewMother.js';
import { PlantReadViewMother } from '../queries/PlantReadViewMother.js';

const CATALOG_TTL = 86400;

describe('GetPlant', () => {
  let repository: PlantReadRepositoryMock;
  let familySummaryReader: FamilySummaryReaderMock;
  let likesCounter: PlantLikesCounterReaderFake;
  let cache: CacheRepositoryFake;
  let getPlant: GetPlant;
  const USER: UserSessionInfo = {
    username: 'user',
    id: random.uuid(),
    email: 'user@example.com',
    roles: ['user']
  };
  const ADMIN: UserSessionInfo = {
    username: 'admin',
    id: random.uuid(),
    email: 'admin@example.com',
    roles: ['admin']
  };
  const COLLABORATOR: UserSessionInfo = {
    username: 'collaborator',
    id: random.uuid(),
    email: 'collaborator@example.com',
    roles: ['collaborator']
  };

  beforeEach(() => {
    repository = new PlantReadRepositoryMock();
    familySummaryReader = new FamilySummaryReaderMock();
    likesCounter = new PlantLikesCounterReaderFake();
    cache = new CacheRepositoryFake();
    getPlant = new GetPlant({
      plantReadRepository: repository,
      familySummaryReader,
      plantLikesCounterRepository: likesCounter,
      cacheRepository: cache,
      cacheCatalogTtlSeconds: CATALOG_TTL
    });
  });

  it('should search only active plants for regular users', async () => {
    const plant = PlantReadViewMother.tomato();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, USER)).resolves.toEqual(plant);

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
    repository.assertFindByIdNotCalled();
  });

  it('should throw error when plant does not exist', async () => {
    const id = random.uuid();
    await expect(getPlant.execute(id, USER)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(id);
  });

  it('should throw error if plant is deleted and user tries to access it', async () => {
    const plant = PlantReadViewMother.deleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, USER)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
  });

  it('should only look up active plants for anonymous requests', async () => {
    const plant = PlantReadViewMother.deleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, undefined)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );

    repository.assertFindActiveByIdHasBeenCalledWith(plant.id);
  });

  it('should return plant if it is deleted but user has admin role', async () => {
    const plant = PlantReadViewMother.deleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, ADMIN)).resolves.toEqual(plant);

    repository.assertFindByIdHasBeenCalledWith(plant.id);
    repository.assertFindActiveByIdNotCalled();
  });

  it('should return plant if it is deleted but user has collaborator role', async () => {
    const plant = PlantReadViewMother.deleted();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, COLLABORATOR)).resolves.toEqual(
      plant
    );

    repository.assertFindByIdHasBeenCalledWith(plant.id);
  });

  it('returns stored data as is, without building a Plant', async () => {
    const plant = PlantReadViewMother.breakingABusinessRule();
    repository.addToStorage(plant);

    await expect(getPlant.execute(plant.id, USER)).resolves.toEqual(plant);
  });

  describe('resolving by slug', () => {
    it('looks up an active plant by slug when the id is not a UUID', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await expect(getPlant.execute(plant.slug!, USER)).resolves.toEqual(plant);

      repository.assertFindActiveBySlugHasBeenCalledWith(plant.slug!);
      repository.assertFindActiveByIdNotCalled();
    });

    it('looks up a deleted plant by slug for admins', async () => {
      const plant = PlantReadViewMother.deleted();
      repository.addToStorage(plant);

      await expect(getPlant.execute(plant.slug!, ADMIN)).resolves.toEqual(
        plant
      );

      repository.assertFindBySlugHasBeenCalledWith(plant.slug!);
    });

    it('hides a deleted plant from regular users looking up by slug', async () => {
      const plant = PlantReadViewMother.deleted();
      repository.addToStorage(plant);

      await expect(getPlant.execute(plant.slug!, USER)).rejects.toBeInstanceOf(
        DomainNotFoundException
      );

      repository.assertFindActiveBySlugHasBeenCalledWith(plant.slug!);
    });
  });

  describe('with a fieldset', () => {
    it('should forward the fieldset to the repository', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await expect(
        getPlant.execute(plant.id, USER, { fields: ['identity'] })
      ).resolves.toEqual({ id: plant.id, identity: plant.identity });

      repository.assertFindActiveByIdHasBeenCalledWith(plant.id, {
        fields: ['identity']
      });
    });

    it('should still hide a deleted plant from regular users', async () => {
      const plant = PlantReadViewMother.deleted();
      repository.addToStorage(plant);

      await expect(
        getPlant.execute(plant.id, USER, { fields: ['identity'] })
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('should show a deleted plant to admins', async () => {
      const plant = PlantReadViewMother.deleted();
      repository.addToStorage(plant);

      await expect(
        getPlant.execute(plant.id, ADMIN, { fields: ['status'] })
      ).resolves.toEqual({ id: plant.id, status: 'DELETED' });
    });
  });

  describe('including the family', () => {
    it('should embed the family summary with one read', async () => {
      const family = FamilySummaryViewMother.random();
      familySummaryReader.add(family);
      const plant = PlantReadViewMother.ofFamily(family.id);
      repository.addToStorage(plant);

      const result = await getPlant.execute(plant.id, USER, {
        include: ['family']
      });

      expect(result.identity?.family).toEqual(family);
      familySummaryReader.assertCalledOnceWith([family.id]);
      repository.assertFindActiveByIdHasBeenCalledWith(plant.id, {});
    });

    it('should keep the plain id when the family is not found', async () => {
      const plant = PlantReadViewMother.ofFamily(random.uuid());
      repository.addToStorage(plant);

      const result = await getPlant.execute(plant.id, USER, {
        include: ['family']
      });

      expect(result).toEqual(plant);
    });

    it('should not read families without include', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await getPlant.execute(plant.id, USER);

      familySummaryReader.assertNotCalled();
    });

    it('should not read families when the fieldset leaves out identity', async () => {
      const family = FamilySummaryViewMother.random();
      familySummaryReader.add(family);
      const plant = PlantReadViewMother.ofFamily(family.id);
      repository.addToStorage(plant);

      const result = await getPlant.execute(plant.id, USER, {
        include: ['family'],
        fields: ['traits']
      });

      expect(result).toEqual({ id: plant.id, traits: plant.traits });
      familySummaryReader.assertNotCalled();
    });
  });

  describe('caching', () => {
    it('caches the full entry under its id key with the catalog TTL', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await getPlant.execute(plant.id, USER);

      expect(cache.setMock).toHaveBeenCalledWith(
        catalogIdKey('plants', plant.id),
        expect.objectContaining({ id: plant.id }),
        CATALOG_TTL
      );
    });

    it('excludes the volatile likesCount from the cached projection', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await getPlant.execute(plant.id, USER);

      const [, cachedValue] = cache.setMock.mock.calls[0]!;
      expect(cachedValue).not.toHaveProperty('likesCount');
    });

    it('serves a repeated read from cache without re-querying the repository', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);
      const findActiveById = jest.spyOn(repository, 'findActiveById');

      await getPlant.execute(plant.id, USER);
      await getPlant.execute(plant.id, USER);

      expect(findActiveById).toHaveBeenCalledTimes(1);
    });

    it('merges the live likesCount on a cold read', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);
      likesCounter.set(plant.id, 7);

      const result = await getPlant.execute(plant.id, USER);

      expect(result.likesCount).toBe(7);
    });

    it('merges updated live likesCount on a warm cache read', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);
      likesCounter.set(plant.id, 7);
      await getPlant.execute(plant.id, USER);
      likesCounter.set(plant.id, 9);

      const result = await getPlant.execute(plant.id, USER);

      expect(result.likesCount).toBe(9);
    });

    it('bypasses the cache entirely for a curator read', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await getPlant.execute(plant.id, ADMIN);

      expect(cache.getMock).not.toHaveBeenCalled();
      expect(cache.setMock).not.toHaveBeenCalled();
    });

    it('bypasses the cache for a sparse fieldset read', async () => {
      const plant = PlantReadViewMother.tomato();
      repository.addToStorage(plant);

      await getPlant.execute(plant.id, USER, { fields: ['identity'] });

      expect(cache.getMock).not.toHaveBeenCalled();
      expect(cache.setMock).not.toHaveBeenCalled();
    });
  });
});
