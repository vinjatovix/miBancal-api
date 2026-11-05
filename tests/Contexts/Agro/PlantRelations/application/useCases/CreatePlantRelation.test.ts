import { CreatePlantRelation } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/CreatePlantRelation.js';
import type {
  CreatePlantRelationDto,
  ScopedCreatePlantRelationDto
} from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/interfaces/CreatePlantRelationDto.js';
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
  let familySummaryReader: { findById: jest.Mock };
  let useCase: CreatePlantRelation;

  const tomatoView = PlantReadViewMother.tomato();
  const basilView = PlantReadViewMother.random();
  const SOLANACEAE_FAMILY_ID = '0192e200-0000-7000-8000-000000000010';
  const LAMIACEAE_FAMILY_ID = '0192e200-0000-7000-8000-000000000020';

  const validLegacyDto: CreatePlantRelationDto = {
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

  const validScopedDto: ScopedCreatePlantRelationDto = {
    id: '0192e201-0000-7000-8000-000000000002',
    source: { scope: 'genus', value: 'Tagetes' },
    target: { scope: 'family', value: SOLANACEAE_FAMILY_ID },
    type: 'beneficial',
    mechanism: 'pest_repellent',
    strength: 4,
    proximity: {
      minDistanceCm: 0,
      maxDistanceCm: 100
    },
    reason: 'Tagetes root exudates repel nematodes for Solanaceae.'
  };

  beforeEach(() => {
    plantRelationRepository = new PlantRelationRepositoryMock();
    plantReadRepository = new PlantReadRepositoryMock();
    plantReadRepository.addToStorage(tomatoView);
    plantReadRepository.addToStorage(basilView);

    familySummaryReader = {
      findById: jest.fn((id: string) => {
        const families: Record<
          string,
          { id: string; name: string; slug: string }
        > = {
          [SOLANACEAE_FAMILY_ID]: {
            id: SOLANACEAE_FAMILY_ID,
            name: 'Solanaceae',
            slug: 'solanaceae'
          },
          [LAMIACEAE_FAMILY_ID]: {
            id: LAMIACEAE_FAMILY_ID,
            name: 'Lamiaceae',
            slug: 'lamiaceae'
          }
        };

        return Promise.resolve(families[id] ?? null);
      })
    };

    useCase = new CreatePlantRelation({
      plantRelationRepository,
      plantReadRepository,
      familySummaryReader
    });
  });

  describe('legacy species-to-species creation', () => {
    it('creates and persists a plant relation promoting legacy plant IDs to plant scope', async () => {
      const result = await useCase.execute(validLegacyDto, 'curator-1');

      expect(result.id).toBe(validLegacyDto.id);
      expect(result.source.scope).toBe('plant');
      expect(result.source.value).toBe(validLegacyDto.sourcePlantId);
      expect(result.target.scope).toBe('plant');
      expect(result.target.value).toBe(validLegacyDto.targetPlantId);
      expect(result.sourcePlantId).toBe(validLegacyDto.sourcePlantId);
      expect(result.targetPlantId).toBe(validLegacyDto.targetPlantId);
      expect(result.type).toBe('beneficial');
      expect(result.mechanism).toBe('pest_repellent');
      expect(result.strength).toBe(4);
      expect(result.proximity.toPrimitives()).toEqual(validLegacyDto.proximity);
      expect(result.reason).toBe(validLegacyDto.reason);
      expect(result.metadata.createdBy).toBe('curator-1');
      expect(result.version).toBe(0);

      plantRelationRepository.assertSaveHasBeenCalledWith(result);
    });

    it('rejects creation when sourcePlantId and targetPlantId are the same', async () => {
      const selfRelationDto: CreatePlantRelationDto = {
        ...validLegacyDto,
        targetPlantId: validLegacyDto.sourcePlantId
      };

      await expect(
        useCase.execute(selfRelationDto, 'curator-1')
      ).rejects.toThrow(InvalidArgumentException);
    });

    it.each([['sourcePlantId'], ['targetPlantId']] as const)(
      'rejects creation when %s is not found or not active',
      async (field) => {
        const nonExistentDto: CreatePlantRelationDto = {
          ...validLegacyDto,
          [field]: '0192e200-0000-7000-8000-000000000999'
        };

        await expect(
          useCase.execute(nonExistentDto, 'curator-1')
        ).rejects.toThrow(InvalidArgumentException);
      }
    );
  });

  describe('scoped relation creation', () => {
    it('creates a scoped genus-to-family relation', async () => {
      const result = await useCase.execute(validScopedDto, 'curator-1');

      expect(result.id).toBe(validScopedDto.id);
      expect(result.source.scope).toBe('genus');
      expect(result.source.value).toBe('Tagetes');
      expect(result.target.scope).toBe('family');
      expect(result.target.value).toBe(SOLANACEAE_FAMILY_ID);
      expect(result.sourcePlantId).toBeUndefined();
      expect(result.targetPlantId).toBeUndefined();
      expect(result.type).toBe('beneficial');
      expect(result.version).toBe(0);

      plantRelationRepository.assertSaveHasBeenCalledWith(result);
    });

    it('creates a universal broadcast relation targeting all', async () => {
      const broadcastDto: ScopedCreatePlantRelationDto = {
        id: '0192e201-0000-7000-8000-000000000003',
        source: { scope: 'genus', value: 'Trifolium' },
        target: { scope: 'all' },
        type: 'beneficial',
        mechanism: 'nitrogen_fixer',
        strength: 5,
        proximity: { minDistanceCm: 0, maxDistanceCm: 100 },
        reason: 'Fixes atmospheric nitrogen for all neighbors'
      };

      const result = await useCase.execute(broadcastDto, 'curator-1');

      expect(result.source.scope).toBe('genus');
      expect(result.source.value).toBe('Trifolium');
      expect(result.target.isAll()).toBe(true);
      expect(result.target.value).toBeUndefined();
    });

    it('rejects creation when source scope is all', async () => {
      const invalidSourceDto = {
        id: '0192e201-0000-7000-8000-000000000004',
        source: { scope: 'all' as unknown as 'genus' },
        target: { scope: 'family' as const, value: SOLANACEAE_FAMILY_ID },
        type: 'beneficial' as const,
        mechanism: 'pest_repellent' as const,
        strength: 3,
        proximity: { minDistanceCm: 0, maxDistanceCm: 50 },
        reason: 'Invalid broadcast source'
      };

      await expect(
        useCase.execute(invalidSourceDto, 'curator-1')
      ).rejects.toThrow(InvalidArgumentException);
    });

    it('rejects creation when source and target have identical genus names', async () => {
      const selfGenusDto: ScopedCreatePlantRelationDto = {
        id: '0192e201-0000-7000-8000-000000000005',
        source: { scope: 'genus', value: 'Solanum' },
        target: { scope: 'genus', value: 'solanum' },
        type: 'beneficial',
        mechanism: 'growth_stimulator',
        strength: 3,
        proximity: { minDistanceCm: 0, maxDistanceCm: 50 },
        reason: 'Identical genus'
      };

      await expect(useCase.execute(selfGenusDto, 'curator-1')).rejects.toThrow(
        InvalidArgumentException
      );
    });

    it('rejects creation when family scope references non-existent family ID', async () => {
      const missingFamilyDto: ScopedCreatePlantRelationDto = {
        id: '0192e201-0000-7000-8000-000000000006',
        source: { scope: 'genus', value: 'Ocimum' },
        target: {
          scope: 'family',
          value: '0192e200-0000-7000-8000-000000000999'
        },
        type: 'beneficial',
        mechanism: 'pest_repellent',
        strength: 3,
        proximity: { minDistanceCm: 0, maxDistanceCm: 50 },
        reason: 'Non-existent family'
      };

      await expect(
        useCase.execute(missingFamilyDto, 'curator-1')
      ).rejects.toThrow(InvalidArgumentException);
    });
  });

  describe('conflict rejection', () => {
    it('throws DomainConflictException when relation with same source, target, and mechanism already exists', async () => {
      const existing = PlantRelationMother.create({
        sourcePlantId: createPlantId(validLegacyDto.sourcePlantId),
        targetPlantId: createPlantId(validLegacyDto.targetPlantId),
        mechanism: validLegacyDto.mechanism,
        user: 'curator-1'
      });
      plantRelationRepository.populate([existing]);

      await expect(
        useCase.execute(validLegacyDto, 'curator-1')
      ).rejects.toThrow(DomainConflictException);
    });
  });
});
