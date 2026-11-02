import { bedPersistenceMapper } from '../../../../../src/Contexts/Agro/Beds/mappers/bedPersistenceMapper.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { BedFactory } from '../domain/mothers/BedFactory.js';

describe('bedPersistenceMapper', () => {
  describe('toMongoDocument', () => {
    it('should map Bed to mongo document correctly', () => {
      const bed = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.name).toBe(bed.name.value);

      expect(document.width).toBe(bed.width.value);
      expect(document.height).toBe(bed.height.value);
      expect(document.depth).toBe(bed.depth.value);

      expect(document.deleted).toBe(bed.isDeleted);

      expect(document.metadata).toEqual(bed.metadata.toPrimitives());
    });

    it('should map ids as mongo binary uuids', () => {
      const bed = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document._id).toBeDefined();
      expect(document.userId).toBeDefined();
    });

    it('should include deletedAt when present', () => {
      const bed = BedFactory.randomDeleted();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.deletedAt).toBeDefined();
      expect(typeof document.deletedAt).toBe('string');
    });

    it('should omit deletedAt when absent', () => {
      const bed = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.deletedAt).toBeUndefined();
    });

    it('should include geographic fields when present', () => {
      const bed = BedFactory.create({
        postalCode: 'C1001',
        country: 'Argentina',
        timezone: 'America/Argentina/Buenos_Aires',
        hemisphere: 'south'
      });

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.postalCode).toBe('C1001');
      expect(document.country).toBe('Argentina');
      expect(document.timezone).toBe('America/Argentina/Buenos_Aires');
      expect(document.hemisphere).toBe('south');
    });

    it('should omit geographic fields when absent', () => {
      const bed = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(bed);

      expect(document.postalCode).toBeUndefined();
      expect(document.country).toBeUndefined();
      expect(document.timezone).toBeUndefined();
      expect(document.hemisphere).toBeUndefined();
    });
  });

  describe('fromMongoDocument', () => {
    it('should map mongo document to Bed correctly', () => {
      const original = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(original);

      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(bed.id).toBe(original.id);
      expect(bed.userId).toBe(original.userId);

      expect(bed.name.value).toBe(original.name.value);

      expect(bed.width.value).toBe(original.width.value);
      expect(bed.height.value).toBe(original.height.value);
      expect(bed.depth.value).toBe(original.depth.value);

      expect(bed.isDeleted).toBe(original.isDeleted);
    });

    it('should map geographic fields from mongo document correctly', () => {
      const original = BedFactory.create({
        postalCode: 'C1001',
        country: 'Argentina',
        timezone: 'America/Argentina/Buenos_Aires',
        hemisphere: 'south'
      });

      const document = bedPersistenceMapper.toMongoDocument(original);
      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(bed.postalCode).toBe('C1001');
      expect(bed.country).toBe('Argentina');
      expect(bed.timezone).toBe('America/Argentina/Buenos_Aires');
      expect(bed.hemisphere).toBe('south');
    });

    it('should leave geographic fields undefined when absent in mongo document', () => {
      const original = BedFactory.create();

      const document = bedPersistenceMapper.toMongoDocument(original);
      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(bed.postalCode).toBeUndefined();
      expect(bed.country).toBeUndefined();
      expect(bed.timezone).toBeUndefined();
      expect(bed.hemisphere).toBeUndefined();
    });

    it('should round-trip the version', () => {
      const original = BedFactory.create({ version: 3 });

      const document = bedPersistenceMapper.toMongoDocument(original);
      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(document.version).toBe(3);
      expect(bed.version).toBe(3);
    });

    it('should restore deletedAt correctly', () => {
      const original = BedFactory.randomDeleted();

      const document = bedPersistenceMapper.toMongoDocument(original);

      const bed = bedPersistenceMapper.fromMongoDocument(document);

      expect(bed.deletedAt).toBeInstanceOf(Date);
      expect(bed.isDeleted).toBe(true);
    });

    it('should be reversible', () => {
      const original = BedFactory.randomDeleted();

      const document = bedPersistenceMapper.toMongoDocument(original);

      const restored = bedPersistenceMapper.fromMongoDocument(document);

      const restoredDocument = bedPersistenceMapper.toMongoDocument(restored);

      expect(restoredDocument).toMatchObject(document);
    });
  });

  describe('bed name', () => {
    it('should reject a stored blank name', () => {
      const document = {
        ...bedPersistenceMapper.toMongoDocument(BedFactory.create()),
        name: ''
      };

      const load = () => bedPersistenceMapper.fromMongoDocument(document);

      expect(load).toThrow(InvalidArgumentException);
    });
  });
});
