import type {
  PlantRelationReadView,
  PlantSummaryView
} from '../../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import { ListPlantRelations } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/ListPlantRelations.js';
import { PlantRelationReadRepositoryMock } from '../../__mocks__/PlantRelationReadRepositoryMock.js';
import { PlantSummaryReaderMock } from '../../__mocks__/PlantSummaryReaderMock.js';

describe('ListPlantRelations', () => {
  let readRepository: PlantRelationReadRepositoryMock;
  let summaryReader: PlantSummaryReaderMock;
  let useCase: ListPlantRelations;

  const sampleView: PlantRelationReadView = {
    id: '0192e201-0000-7000-8000-000000000001',
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
    id: sampleView.sourcePlantId,
    name: { primary: 'tomate' },
    scientificName: 'solanum lycopersicum',
    image: { url: 'https://example.com/tomato.jpg' }
  };

  const sampleTargetSummary: PlantSummaryView = {
    id: sampleView.targetPlantId,
    name: { primary: 'albahaca' },
    scientificName: 'ocimum basilicum',
    image: null
  };

  beforeEach(() => {
    readRepository = new PlantRelationReadRepositoryMock();
    summaryReader = new PlantSummaryReaderMock();
    useCase = new ListPlantRelations({
      plantRelationReadRepository: readRepository,
      plantSummaryReader: summaryReader
    });
  });

  it('should call findAll without options when dto is undefined', async () => {
    readRepository.populate([sampleView]);

    const result = await useCase.execute();

    expect(result.data).toEqual([sampleView]);
    expect(result.pagination.totalItems).toBe(1);
    readRepository.assertFindAllHasBeenCalled();
    summaryReader.assertNotCalled();
  });

  it('should forward query options to read repository findAll', async () => {
    readRepository.populate([sampleView]);
    const query = {
      filter: { type: { eq: 'beneficial' as const } },
      pagination: { page: 1, limit: 10 }
    };

    const result = await useCase.execute({ query });

    expect(result.data).toEqual([sampleView]);
    expect(readRepository.findAllMock).toHaveBeenCalledWith(query);
  });

  it('should embed sourcePlant and targetPlant when include is present in query options', async () => {
    readRepository.populate([sampleView]);
    summaryReader.add(sampleSourceSummary, sampleTargetSummary);
    const query = {
      include: ['sourcePlant', 'targetPlant'] as const,
      pagination: { page: 1, limit: 10 }
    };

    const result = await useCase.execute({ query });

    expect(result.data).toEqual([
      {
        ...sampleView,
        sourcePlant: sampleSourceSummary,
        targetPlant: sampleTargetSummary
      }
    ]);
  });
});
