import { CreatePlantRelation } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/CreatePlantRelation.js';
import type { CreatePlantRelationDto } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/interfaces/CreatePlantRelationDto.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantReadRepositoryMock } from '../../../Plants/__mocks__/PlantReadRepositoryMock.js';
import { PlantReadViewMother } from '../../../Plants/application/queries/PlantReadViewMother.js';
import { PlantRelationRepositoryMock } from '../../__mocks__/PlantRelationRepositoryMock.js';
import { PlantRelationMother } from '../../domain/mothers/PlantRelationMother.js';

describe('CreatePlantRelation', () => {
  let plantRelationRepository: PlantRelationRepositoryMock;
  let plantReadRepository: PlantReadRepositoryMock;
  let useCase: CreatePlantRelation;

  const tomatoView = PlantReadViewMother.tomato();
  const basilView = PlantReadViewMother.random();

  const validDto: CreatePlantRelationDto = {
    id: '0192e201-0000-7000-8000-000000000001',
    sourcePlantId: basilView.id,
    targetPlantId: tomatoView.id,
    type: 'beneficial',
    mechanism: 'pest_repellent',
    strength: 4,
    proximity: {
      minDistanceCm: 0,
      maxDistanceCm: 50
    },
    reason: 'Basil repels hornworms and thrips from tomato.'
  };

  beforeEach(() => {
    plantRelationRepository = new PlantRelationRepositoryMock();
    plantReadRepository = new PlantReadRepositoryMock();
    plantReadRepository.addToStorage(tomatoView);
    plantReadRepository.addToStorage(basilView);

    useCase = new CreatePlantRelation({
      plantRelationRepository,
      plantReadRepository
    });
  });

  it('should successfully create and persist a new plant relation', async () => {
    const result = await useCase.execute(validDto, 'curator-1');

    expect(result.id).toBe(validDto.id);
    expect(result.sourcePlantId).toBe(validDto.sourcePlantId);
    expect(result.targetPlantId).toBe(validDto.targetPlantId);
    expect(result.type).toBe('beneficial');
    expect(result.mechanism).toBe('pest_repellent');
    expect(result.strength).toBe(4);
    expect(result.proximity.toPrimitives()).toEqual(validDto.proximity);
    expect(result.reason).toBe(validDto.reason);
    expect(result.metadata.createdBy).toBe('curator-1');
    expect(result.version).toBe(0);

    plantRelationRepository.assertSaveHasBeenCalledWith(result);
  });

  it('should reject creation when sourcePlantId and targetPlantId are the same', async () => {
    const selfRelationDto: CreatePlantRelationDto = {
      ...validDto,
      targetPlantId: validDto.sourcePlantId
    };

    await expect(useCase.execute(selfRelationDto, 'curator-1')).rejects.toThrow(
      InvalidArgumentException
    );
  });

  it.each([['sourcePlantId'], ['targetPlantId']] as const)(
    'should reject creation when %s is not found or not active',
    async (field) => {
      const nonExistentDto: CreatePlantRelationDto = {
        ...validDto,
        [field]: '0192e200-0000-7000-8000-000000000999'
      };

      await expect(
        useCase.execute(nonExistentDto, 'curator-1')
      ).rejects.toThrow(InvalidArgumentException);
    }
  );

  it('should throw DomainConflictException when relation with same source, target, and mechanism already exists', async () => {
    const existing = PlantRelationMother.create({
      sourcePlantId: createPlantId(validDto.sourcePlantId),
      targetPlantId: createPlantId(validDto.targetPlantId),
      mechanism: validDto.mechanism,
      user: 'curator-1'
    });
    plantRelationRepository.populate([existing]);

    await expect(useCase.execute(validDto, 'curator-1')).rejects.toThrow(
      DomainConflictException
    );
  });
});
