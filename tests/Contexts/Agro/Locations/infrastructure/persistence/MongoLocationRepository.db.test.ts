import { asClass, asValue } from 'awilix';
import type { Db } from 'mongodb';

import { up as createLocationsCollection } from '../../../../../../migrations/scripts/20261102000000-create-locations-collection.js';
import type { LocationRepository } from '../../../../../../src/Contexts/Agro/Locations/domain/repositories/interfaces/LocationRepository.js';
import { MongoLocationRepository } from '../../../../../../src/Contexts/Agro/Locations/infrastructure/persistence/MongoLocationRepository.js';
import { locationDomainMapper } from '../../../../../../src/Contexts/Agro/Locations/mappers/locationDomainMapper.js';
import { locationPersistenceMapper } from '../../../../../../src/Contexts/Agro/Locations/mappers/locationPersistenceMapper.js';
import { randomUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { LocationFactory } from '../../domain/mothers/LocationFactory.js';

let context: DbTestContext;
let repository: LocationRepository;
let db: Db;

const getStageNames = (plan: Record<string, unknown>): string[] => {
  const stages: string[] = [];
  const traverse = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (typeof obj.stage === 'string') stages.push(obj.stage);
    if (obj.inputStage) traverse(obj.inputStage);
    if (Array.isArray(obj.inputStages)) obj.inputStages.forEach(traverse);
  };
  traverse(plan);
  return stages;
};

describe('MongoLocationRepository', () => {
  beforeAll(async () => {
    context = await createDbTestContext({
      locationPersistenceMapper: asValue(locationPersistenceMapper),
      locationRepository: asClass(MongoLocationRepository).singleton()
    });
    db = context.db;
    await createLocationsCollection(db);
    repository =
      context.container.resolve<LocationRepository>('locationRepository');
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('create and uniqueness', () => {
    it('creates a location and finds it owned and active', async () => {
      const location = LocationFactory.domainBase({});

      await repository.create(location);

      const found = await repository.findOwnedActiveById(
        location.id,
        location.userId
      );
      expect(found?.id).toBe(location.id);
    });

    it('finds active locations by IDs for owner and ignores deleted or foreign locations', async () => {
      const userId = randomUserId();
      const otherUserId = randomUserId();
      const loc1 = LocationFactory.domainBase({ userId, name: 'Parcela 1' });
      const loc2 = LocationFactory.domainBase({ userId, name: 'Parcela 2' });
      const locDeleted = LocationFactory.domainBase({
        userId,
        name: 'Parcela Borrada'
      });
      const locOtherUser = LocationFactory.domainBase({
        userId: otherUserId,
        name: 'Parcela Ajena'
      });

      await repository.create(loc1);
      await repository.create(loc2);
      await repository.create(locDeleted);
      await repository.create(locOtherUser);

      const before = locationDomainMapper.toPrimitives(locDeleted);
      locDeleted.markAsDeleted('tester', new Date());
      await repository.updateWithDiff(
        before,
        locationDomainMapper.toPrimitives(locDeleted)
      );

      const results = await repository.findActiveByIdsForOwner(
        [
          loc1.id,
          loc2.id,
          locDeleted.id,
          locOtherUser.id,
          '00000000-0000-4000-8000-000000000000'
        ],
        userId
      );

      expect(results.map((l) => l.id).sort()).toEqual(
        [loc1.id, loc2.id].sort()
      );
    });

    it('returns empty array when findActiveByIdsForOwner receives empty IDs array', async () => {
      const results = await repository.findActiveByIdsForOwner(
        [],
        randomUserId()
      );

      expect(results).toEqual([]);
    });

    it('rejects a duplicate active name for the same owner', async () => {
      const userId = randomUserId();
      const first = LocationFactory.domainBase({ userId, name: 'Huerto' });
      const second = LocationFactory.domainBase({ userId, name: 'huerto' });
      await repository.create(first);

      await expect(repository.create(second)).rejects.toBeInstanceOf(
        DomainConflictException
      );
    });

    it('allows the same name for a different owner', async () => {
      const first = LocationFactory.domainBase({ name: 'Huerto' });
      const second = LocationFactory.domainBase({ name: 'Huerto' });
      await repository.create(first);

      await expect(repository.create(second)).resolves.toBeUndefined();
    });

    it('reuses the name after the original is soft-deleted', async () => {
      const userId = randomUserId();
      const first = LocationFactory.domainBase({ userId, name: 'Huerto' });
      await repository.create(first);

      const before = locationDomainMapper.toPrimitives(first);
      first.markAsDeleted('gardener', new Date());
      await repository.updateWithDiff(
        before,
        locationDomainMapper.toPrimitives(first)
      );

      const second = LocationFactory.domainBase({ userId, name: 'Huerto' });

      await expect(repository.create(second)).resolves.toBeUndefined();
    });
  });

  describe('findActiveByNameForOwner (collation equality)', () => {
    it('matches case/accent-insensitively', async () => {
      const userId = randomUserId();
      const location = LocationFactory.domainBase({
        userId,
        name: 'Jardín Norte'
      });
      await repository.create(location);

      const found = await repository.findActiveByNameForOwner(
        userId,
        'jardin norte'
      );

      expect(found?.id).toBe(location.id);
    });

    it('returns null for a different owner with the same name', async () => {
      const location = LocationFactory.domainBase({ name: 'Huerto' });
      await repository.create(location);

      const found = await repository.findActiveByNameForOwner(
        randomUserId(),
        'Huerto'
      );

      expect(found).toBeNull();
    });
  });

  describe('owner isolation', () => {
    it('findOwnedActiveById never returns a non-owned location', async () => {
      const location = LocationFactory.domainBase({});
      await repository.create(location);

      const found = await repository.findOwnedActiveById(
        location.id,
        randomUserId()
      );

      expect(found).toBeNull();
    });

    it('findByUserId only lists the owner active locations', async () => {
      const userId = randomUserId();
      const mine = LocationFactory.domainBase({ userId });
      const other = LocationFactory.domainBase({});
      await repository.create(mine);
      await repository.create(other);

      const found = await repository.findByUserId(userId);

      expect(found.map((location) => location.id)).toEqual([mine.id]);
    });
  });

  describe('query index execution analysis', () => {
    it('uses the owner/status index for owner listing, never COLLSCAN', async () => {
      const location = LocationFactory.domainBase({});
      await repository.create(location);

      const explain = (await db
        .collection('locations')
        .find({
          userId: (await db.collection('locations').findOne({}))?.userId,
          status: { $ne: 'deleted' }
        })
        .explain('executionStats')) as Record<string, unknown>;

      const stages = getStageNames(
        (explain.executionStats as Record<string, unknown>)
          ?.executionStages as Record<string, unknown>
      );

      expect(stages).toContain('IXSCAN');
      expect(stages).not.toContain('COLLSCAN');
    });

    it('uses the owner/name unique index for the name lookup, never COLLSCAN', async () => {
      const location = LocationFactory.domainBase({ name: 'Huerto' });
      await repository.create(location);

      const explain = (await db
        .collection('locations')
        .find({
          userId: toMongoId(location.userId),
          name: 'Huerto',
          status: { $ne: 'deleted' }
        })
        .collation({ locale: 'es', strength: 1 })
        .explain('executionStats')) as Record<string, unknown>;

      const stages = getStageNames(
        (explain.executionStats as Record<string, unknown>)
          ?.executionStages as Record<string, unknown>
      );

      expect(stages).toContain('IXSCAN');
      expect(stages).not.toContain('COLLSCAN');
    });
  });

  describe('updateWithDiff', () => {
    it('applies the diff and bumps the stored version', async () => {
      const location = LocationFactory.domainBase({
        latitude: 40.4168,
        longitude: -3.7038
      });
      await repository.create(location);

      const before = locationDomainMapper.toPrimitives(location);
      location.updateCoordinates(
        { latitude: 41.3879, longitude: 2.1699 },
        'gardener',
        new Date()
      );
      const after = locationDomainMapper.toPrimitives(location);

      const outcome = await repository.updateWithDiff(before, after);

      expect(outcome).toBe('written');
      const stored = await repository.findOwnedActiveById(
        location.id,
        location.userId
      );
      expect(stored?.latitude).toBe(41.3879);
      expect(stored?.longitude).toBe(2.1699);
      expect(stored?.version).toBe(1);
    });

    it('returns unchanged when nothing was modified', async () => {
      const location = LocationFactory.domainBase({});
      await repository.create(location);
      const primitives = locationDomainMapper.toPrimitives(location);

      const outcome = await repository.updateWithDiff(primitives, primitives);

      expect(outcome).toBe('unchanged');
    });
  });
});
