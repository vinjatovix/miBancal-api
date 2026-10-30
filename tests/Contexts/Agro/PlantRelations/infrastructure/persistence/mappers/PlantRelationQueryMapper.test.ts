import type { PlantRelationFilter } from '../../../../../../../src/Contexts/Agro/PlantRelations/domain/entities/types/PlantRelationFilter.js';
import { PlantRelationQueryMapper } from '../../../../../../../src/Contexts/Agro/PlantRelations/infrastructure/persistence/mappers/PlantRelationQueryMapper.js';
import { toMongoId } from '../../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';

describe('PlantRelationQueryMapper', () => {
  const mapper = new PlantRelationQueryMapper();
  const plantAId = '00000000-0000-4000-8000-000000000001';
  const plantBId = '00000000-0000-4000-8000-000000000002';

  it('should return empty query when no filter is provided', () => {
    const query = mapper.toMongo({});

    expect(query).toEqual({});
  });

  it('should map sourcePlantId eq to MongoId binary', () => {
    const filter: PlantRelationFilter = {
      sourcePlantId: { eq: plantAId }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      sourcePlantId: toMongoId(plantAId)
    });
  });

  it('should map sourcePlantId in to array of MongoId binaries', () => {
    const filter: PlantRelationFilter = {
      sourcePlantId: { in: [plantAId, plantBId] }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      sourcePlantId: {
        $in: [toMongoId(plantAId), toMongoId(plantBId)]
      }
    });
  });

  it('should map targetPlantId eq to MongoId binary', () => {
    const filter: PlantRelationFilter = {
      targetPlantId: { eq: plantBId }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      targetPlantId: toMongoId(plantBId)
    });
  });

  it('should map targetPlantId in to array of MongoId binaries', () => {
    const filter: PlantRelationFilter = {
      targetPlantId: { in: [plantAId, plantBId] }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      targetPlantId: {
        $in: [toMongoId(plantAId), toMongoId(plantBId)]
      }
    });
  });

  it('should map plantId eq to an $or clause on sourcePlantId or targetPlantId', () => {
    const filter: PlantRelationFilter = {
      plantId: { eq: plantAId }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      $or: [
        { sourcePlantId: toMongoId(plantAId) },
        { targetPlantId: toMongoId(plantAId) }
      ]
    });
  });

  it('should map plantId in to an $or clause with $in arrays', () => {
    const filter: PlantRelationFilter = {
      plantId: { in: [plantAId, plantBId] }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      $or: [
        { sourcePlantId: { $in: [toMongoId(plantAId), toMongoId(plantBId)] } },
        { targetPlantId: { $in: [toMongoId(plantAId), toMongoId(plantBId)] } }
      ]
    });
  });

  it.each([['beneficial'], ['detrimental']] as const)(
    'should map type eq %s',
    (type) => {
      const filter: PlantRelationFilter = {
        type: { eq: type }
      };

      const query = mapper.toMongo(filter);

      expect(query).toEqual({ type });
    }
  );

  it('should map type in to $in condition', () => {
    const filter: PlantRelationFilter = {
      type: { in: ['beneficial', 'detrimental'] }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      type: { $in: ['beneficial', 'detrimental'] }
    });
  });

  it('should map mechanism eq', () => {
    const filter: PlantRelationFilter = {
      mechanism: { eq: 'pest_repellent' }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      mechanism: 'pest_repellent'
    });
  });

  it('should map mechanism in to $in condition', () => {
    const filter: PlantRelationFilter = {
      mechanism: { in: ['pest_repellent', 'nitrogen_fixer'] }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      mechanism: { $in: ['pest_repellent', 'nitrogen_fixer'] }
    });
  });

  it('should combine scalar query fields with $or clause', () => {
    const filter: PlantRelationFilter = {
      type: { eq: 'beneficial' },
      plantId: { eq: plantAId }
    };

    const query = mapper.toMongo(filter);

    expect(query).toEqual({
      type: 'beneficial',
      $or: [
        { sourcePlantId: toMongoId(plantAId) },
        { targetPlantId: toMongoId(plantAId) }
      ]
    });
  });

  describe('sort mapping', () => {
    it.each([
      ['createdAt', 'metadata.createdAt'],
      ['id', '_id'],
      ['strength', 'strength'],
      ['type', 'type']
    ])('should map sort field %s to %s', (input, expected) => {
      expect(mapper.toSortField(input)).toBe(expected);
    });
  });
});
