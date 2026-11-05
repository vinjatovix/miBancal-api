import { asClass } from 'awilix';

import type { GardenInputReadRepository } from '../../../../../../../src/Contexts/Agro/GardenInputs/application/queries/GardenInputReadRepository.js';
import { MongoGardenInputReadRepository } from '../../../../../../../src/Contexts/Agro/GardenInputs/infrastructure/persistence/MongoGardenInputReadRepository.js';
import type { MongoGardenInputDocument } from '../../../../../../../src/Contexts/Agro/GardenInputs/infrastructure/persistence/types/MongoGardenInputDocument.js';
import { fromMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { GardenInputMother } from '../../../domain/mothers/GardenInputMother.js';

let context: DbTestContext;
let repository: GardenInputReadRepository;

const insertDocument = async (
  document: MongoGardenInputDocument
): Promise<void> => {
  await context.db
    .collection<MongoGardenInputDocument>('gardenInputs')
    .insertOne(document);
};

describe('MongoGardenInputReadRepository', () => {
  beforeAll(async () => {
    context = await createDbTestContext({
      gardenInputReadRepository: asClass(
        MongoGardenInputReadRepository
      ).singleton()
    });
    repository = context.container.resolve<GardenInputReadRepository>(
      'gardenInputReadRepository'
    );
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context.close();
  });

  describe('findById and findActiveById', () => {
    it('finds active garden input by id', async () => {
      const doc = GardenInputMother.mongoBase();
      await insertDocument(doc);

      const result = await repository.findActiveById(fromMongoId(doc._id));

      expect(result).not.toBeNull();
      expect(result?.slug).toBe(doc.slug);
    });

    it('returns null for deleted garden input when calling findActiveById', async () => {
      const doc = GardenInputMother.mongoBase({
        status: 'deleted',
        deletedAt: new Date()
      });
      await insertDocument(doc);

      const result = await repository.findActiveById(fromMongoId(doc._id));

      expect(result).toBeNull();
    });

    it('returns deleted garden input when calling findById', async () => {
      const doc = GardenInputMother.mongoBase({
        status: 'deleted',
        deletedAt: new Date()
      });
      await insertDocument(doc);

      const result = await repository.findById(fromMongoId(doc._id));

      expect(result).not.toBeNull();
      expect(result?.status).toBe('deleted');
    });
  });

  describe('findBySlug and findActiveBySlug', () => {
    it('finds active garden input by slug', async () => {
      const doc = GardenInputMother.mongoBase({ slug: 'ortiga-purin' });
      await insertDocument(doc);

      const result = await repository.findActiveBySlug('ortiga-purin');

      expect(result).not.toBeNull();
      expect(result?.name).toBe(doc.name);
    });

    it('returns null for deleted garden input when calling findActiveBySlug', async () => {
      const doc = GardenInputMother.mongoBase({
        slug: 'cola-caballo',
        status: 'deleted',
        deletedAt: new Date()
      });
      await insertDocument(doc);

      const result = await repository.findActiveBySlug('cola-caballo');

      expect(result).toBeNull();
    });

    it('returns deleted garden input when calling findBySlug', async () => {
      const doc = GardenInputMother.mongoBase({
        slug: 'cola-caballo',
        status: 'deleted',
        deletedAt: new Date()
      });
      await insertDocument(doc);

      const result = await repository.findBySlug('cola-caballo');

      expect(result).not.toBeNull();
      expect(result?.slug).toBe('cola-caballo');
    });
  });

  describe('findAll', () => {
    it('returns paginated active garden inputs', async () => {
      const doc1 = GardenInputMother.mongoBase({ slug: 'input-1' });
      const doc2 = GardenInputMother.mongoBase({ slug: 'input-2' });
      await insertDocument(doc1);
      await insertDocument(doc2);

      const result = await repository.findAll({
        pagination: { page: 1, limit: 10 }
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalItems).toBe(2);
    });

    it('filters garden inputs by category', async () => {
      const defense = GardenInputMother.mongoBase({
        slug: 'jabon-potasico',
        category: 'defense'
      });
      const fertilizer = GardenInputMother.mongoBase({
        slug: 'purin-ortiga',
        category: 'fertilizer'
      });
      await insertDocument(defense);
      await insertDocument(fertilizer);

      const result = await repository.findAll({
        filter: { category: { eq: 'fertilizer' } }
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.slug).toBe('purin-ortiga');
    });

    it('filters garden inputs by action', async () => {
      const insecticide = GardenInputMother.mongoBase({
        slug: 'jabon',
        actions: ['insecticide']
      });
      const fungicide = GardenInputMother.mongoBase({
        slug: 'azufre',
        actions: ['fungicide']
      });
      await insertDocument(insecticide);
      await insertDocument(fungicide);

      const result = await repository.findAll({
        filter: { action: { eq: 'fungicide' } }
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.slug).toBe('azufre');
    });

    it('projects only requested fields when sparse fieldsets are specified', async () => {
      const doc = GardenInputMother.mongoBase({
        slug: 'extracto-ajo',
        name: 'Extracto de ajo',
        description: 'Repelente natural'
      });
      await insertDocument(doc);

      const result = await repository.findAll({
        fields: ['id', 'slug', 'name']
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('slug', 'extracto-ajo');
      expect(result.data[0]).toHaveProperty('name', 'Extracto de ajo');
      expect(result.data[0]).not.toHaveProperty('description');
    });
  });

  describe('findExistingSlugs', () => {
    it('returns list of existing active slugs', async () => {
      const doc1 = GardenInputMother.mongoBase({ slug: 'slug-a' });
      const doc2 = GardenInputMother.mongoBase({ slug: 'slug-b' });
      await insertDocument(doc1);
      await insertDocument(doc2);

      const result = await repository.findExistingSlugs([
        'slug-a',
        'slug-b',
        'slug-c'
      ]);

      expect(result).toEqual(expect.arrayContaining(['slug-a', 'slug-b']));
      expect(result).not.toContain('slug-c');
    });
  });
});
