import { asClass, asValue } from 'awilix';

import { up as createGardenInputsCollection } from '../../../../../../../migrations/scripts/20261026120000-create-garden-inputs-collection.js';
import type { GardenInputRepository } from '../../../../../../../src/Contexts/Agro/GardenInputs/domain/repositories/interfaces/GardenInputRepository.js';
import { MongoGardenInputRepository } from '../../../../../../../src/Contexts/Agro/GardenInputs/infrastructure/persistence/MongoGardenInputRepository.js';
import { gardenInputDomainMapper } from '../../../../../../../src/Contexts/Agro/GardenInputs/mappers/gardenInputDomainMapper.js';
import { gardenInputPersistenceMapper } from '../../../../../../../src/Contexts/Agro/GardenInputs/mappers/gardenInputPersistenceMapperImpl.js';
import { DomainConflictException } from '../../../../../../../src/Contexts/shared/domain/errors/index.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { GardenInputMother } from '../../../domain/mothers/GardenInputMother.js';

let context: DbTestContext;
let repository: GardenInputRepository;

describe('MongoGardenInputRepository', () => {
  beforeAll(async () => {
    context = await createDbTestContext({
      gardenInputPersistenceMapper: asValue(gardenInputPersistenceMapper),
      gardenInputRepository: asClass(MongoGardenInputRepository).singleton()
    });
    await createGardenInputsCollection(context.db);
    repository = context.container.resolve<GardenInputRepository>(
      'gardenInputRepository'
    );
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('save and exists', () => {
    it('saves a new garden input and checks existence', async () => {
      const input = GardenInputMother.domainBase();

      await repository.save(input);

      expect(await repository.exists(input.idValue)).toBe(true);
    });

    it('rejects duplicate slug with DomainConflictException', async () => {
      const input1 = GardenInputMother.domainBase({ slug: 'mismo-slug' });
      const input2 = GardenInputMother.domainBase({ slug: 'mismo-slug' });
      await repository.save(input1);

      await expect(repository.save(input2)).rejects.toBeInstanceOf(
        DomainConflictException
      );
    });
  });

  describe('findById and findActiveById', () => {
    it('retrieves active garden input by id', async () => {
      const input = GardenInputMother.domainBase();
      await repository.save(input);

      const found = await repository.findActiveById(input.idValue);

      expect(found).not.toBeNull();
      expect(found?.slug).toBe(input.slug);
    });

    it('returns null for deleted garden input in findActiveById', async () => {
      const input = GardenInputMother.domainBase();
      input.markAsDeleted('curator');
      await repository.save(input);

      const found = await repository.findActiveById(input.idValue);

      expect(found).toBeNull();
    });
  });

  describe('findBySlug and findActiveBySlug', () => {
    it('retrieves active garden input by slug', async () => {
      const input = GardenInputMother.domainBase({ slug: 'extracto-neem' });
      await repository.save(input);

      const found = await repository.findActiveBySlug('extracto-neem');

      expect(found).not.toBeNull();
      expect(found?.name).toBe(input.name);
    });
  });

  describe('updateWithDiff', () => {
    it('applies diff, unsets removed fields, and increments version in storage', async () => {
      const input = GardenInputMother.domainBase({
        description: 'Texto para remover'
      });
      await repository.save(input);

      const before = gardenInputDomainMapper.toPrimitives(input);
      input.updateDetails(
        { description: null, name: 'Jabón renovado' },
        'curator'
      );
      const after = gardenInputDomainMapper.toPrimitives(input);

      const outcome = await repository.updateWithDiff(before, after);

      expect(outcome).toBe('written');
      const stored = await repository.findById(input.idValue);
      expect(stored?.name).toBe('Jabón renovado');
      expect(stored?.description).toBeUndefined();
      expect(stored?.version).toBe(1);
    });

    it('returns unchanged when no fields were modified', async () => {
      const input = GardenInputMother.domainBase();
      await repository.save(input);

      const primitives = gardenInputDomainMapper.toPrimitives(input);

      const outcome = await repository.updateWithDiff(primitives, primitives);

      expect(outcome).toBe('unchanged');
    });
  });
});
