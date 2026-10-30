import type {
  PlantRelationReadView,
  PlantSummaryView
} from '../../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import { GetPlantRelationById } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/GetPlantRelationById.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantRelationFamilySummaryReaderMock } from '../../__mocks__/PlantRelationFamilySummaryReaderMock.js';
import { PlantRelationReadRepositoryMock } from '../../__mocks__/PlantRelationReadRepositoryMock.js';
import { PlantSummaryReaderMock } from '../../__mocks__/PlantSummaryReaderMock.js';

describe('GetPlantRelationById', () => {
  let readRepository: PlantRelationReadRepositoryMock;
  let summaryReader: PlantSummaryReaderMock;
  let familyReader: PlantRelationFamilySummaryReaderMock;
  let useCase: GetPlantRelationById;

  const sampleView: PlantRelationReadView = {
    id: '0192e201-0000-7000-8000-000000000001',
    source: {
      scope: 'plant',
      value: '0192e200-0000-7000-8000-000000000001'
    },
    target: {
      scope: 'plant',
      value: '0192e200-0000-7000-8000-000000000002'
    },
    sourcePlantId: '0192e200-0000-7000-8000-000000000001',
    targetPlantId: '0192e200-0000-7000-8000-000000000002',
    type: 'beneficial',
    mechanism: 'pest_repellent',
    strength: 4,
    proximity: { minDistanceCm: 0, maxDistanceCm: 50 },
    reason: 'Repels pests',
    metadata: {
      createdAt: new Date('2026-10-28T12:00:00.000Z'),
      createdBy: 'system',
      updatedAt: new Date('2026-10-28T12:00:00.000Z'),
      updatedBy: 'system'
    },
    version: 0
  };

  const sampleSourceSummary: PlantSummaryView = {
    id: sampleView.sourcePlantId!,
    name: { primary: 'tomate' },
    scientificName: 'solanum lycopersicum',
    image: { url: 'https://example.com/tomato.jpg' }
  };

  const sampleTargetSummary: PlantSummaryView = {
    id: sampleView.targetPlantId!,
    name: { primary: 'albahaca' },
    scientificName: 'ocimum basilicum',
    image: null
  };

  beforeEach(() => {
    readRepository = new PlantRelationReadRepositoryMock();
    summaryReader = new PlantSummaryReaderMock();
    familyReader = new PlantRelationFamilySummaryReaderMock();
    useCase = new GetPlantRelationById({
      plantRelationReadRepository: readRepository,
      plantSummaryReader: summaryReader,
      familySummaryReader: familyReader
    });
  });

  it('should return plant relation read view when found by id without include', async () => {
    readRepository.populate([sampleView]);

    const result = await useCase.execute(sampleView.id);

    expect(result).toEqual(sampleView);
    readRepository.assertFindByIdHasBeenCalledWith(sampleView.id);
    summaryReader.assertNotCalled();
  });

  it('should embed sourcePlant and targetPlant when requested via include option', async () => {
    readRepository.populate([sampleView]);
    summaryReader.add(sampleSourceSummary, sampleTargetSummary);

    const result = await useCase.execute(sampleView.id, {
      include: ['sourcePlant', 'targetPlant']
    });

    expect(result).toEqual({
      ...sampleView,
      sourcePlant: sampleSourceSummary,
      targetPlant: sampleTargetSummary
    });
    readRepository.assertFindByIdHasBeenCalledWith(sampleView.id);
  });

  it('should embed the family summary when a family-scope side is requested via include', async () => {
    const familyId = '0192e100-0000-7000-8000-000000000009';
    const familyView: PlantRelationReadView = {
      ...sampleView,
      source: { scope: 'family', value: familyId },
      sourcePlantId: undefined
    };
    readRepository.populate([familyView]);
    familyReader.add({
      id: familyId,
      name: 'Solanaceae',
      slug: 'solanaceae'
    });

    const result = await useCase.execute(familyView.id, {
      include: ['sourceFamily']
    });

    expect(result).toMatchObject({
      sourceFamily: { id: familyId, name: 'Solanaceae', slug: 'solanaceae' }
    });
    familyReader.assertFindByIdHasBeenCalledWith(familyId);
  });

  it('should throw DomainNotFoundException when plant relation is not found', async () => {
    const nonExistentId = '0192e201-0000-7000-8000-000000000999';

    await expect(useCase.execute(nonExistentId)).rejects.toThrow(
      DomainNotFoundException
    );
    readRepository.assertFindByIdHasBeenCalledWith(nonExistentId);
  });
});
