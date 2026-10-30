import type {
  PlantRelationReadView,
  PlantSummaryView
} from '../../../../../../src/Contexts/Agro/PlantRelations/application/queries/index.js';
import { ListPlantRelations } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/ListPlantRelations.js';
import { deriveGenus } from '../../../../../../src/Contexts/Agro/PlantRelations/application/useCases/resolveAppliesTo.js';
import { PlantReadRepositoryMock } from '../../../Plants/__mocks__/PlantReadRepositoryMock.js';
import { PlantReadViewMother } from '../../../Plants/application/queries/PlantReadViewMother.js';
import { PlantRelationFamilySummaryReaderMock } from '../../__mocks__/PlantRelationFamilySummaryReaderMock.js';
import { PlantRelationReadRepositoryMock } from '../../__mocks__/PlantRelationReadRepositoryMock.js';
import { PlantSummaryReaderMock } from '../../__mocks__/PlantSummaryReaderMock.js';

describe('ListPlantRelations', () => {
  let readRepository: PlantRelationReadRepositoryMock;
  let summaryReader: PlantSummaryReaderMock;
  let familyReader: PlantRelationFamilySummaryReaderMock;
  let plantReadRepository: PlantReadRepositoryMock;
  let useCase: ListPlantRelations;

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
    plantReadRepository = new PlantReadRepositoryMock();
    useCase = new ListPlantRelations({
      plantRelationReadRepository: readRepository,
      plantSummaryReader: summaryReader,
      familySummaryReader: familyReader,
      plantReadRepository
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

  it('should forward scoped query filters to read repository', async () => {
    readRepository.populate([sampleView]);
    const query = {
      filter: {
        sourceScope: { eq: 'plant' as const },
        targetScope: { eq: 'plant' as const },
        genus: { eq: 'Solanum' }
      },
      pagination: { page: 1, limit: 10 }
    };

    const result = await useCase.execute({ query });

    expect(readRepository.findAllMock).toHaveBeenCalledWith(query);
    expect(result.data).toBeDefined();
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

  it('should embed family summaries for family-scope sides when requested', async () => {
    const familyId = '0192e100-0000-7000-8000-000000000009';
    const familyView: PlantRelationReadView = {
      ...sampleView,
      source: { scope: 'family', value: familyId },
      sourcePlantId: undefined
    };
    readRepository.populate([familyView]);
    familyReader.add({ id: familyId, name: 'Solanaceae', slug: 'solanaceae' });

    const result = await useCase.execute({
      query: { include: ['sourceFamily'] }
    });

    expect(result.data[0]).toMatchObject({
      sourceFamily: { id: familyId, name: 'Solanaceae', slug: 'solanaceae' }
    });
    familyReader.assertFindByIdHasBeenCalledWith(familyId);
  });

  it('resolves appliesToPlantId into plant, genus and family, stripping the raw filter', async () => {
    const plant = PlantReadViewMother.tomato();
    plantReadRepository.addToStorage(plant);
    const familyId = plant.identity.family as string;
    const genus = deriveGenus(plant.identity.scientificName);
    readRepository.populate([sampleView]);
    const query = {
      filter: { appliesToPlantId: { eq: plant.id } },
      pagination: { page: 1, limit: 10 }
    };

    await useCase.execute({ query });

    plantReadRepository.assertFindActiveByIdHasBeenCalledWith(plant.id, {
      fields: ['identity']
    });
    expect(readRepository.findAllMock).toHaveBeenCalledWith({
      pagination: { page: 1, limit: 10 },
      filter: {
        appliesTo: { plantId: plant.id.toLowerCase(), genus, familyId }
      }
    });
  });

  it('matches the plant and broadcast tiers when the plant is unknown', async () => {
    const unknownId = '0192e200-0000-7000-8000-0000000000ff';
    readRepository.populate([sampleView]);
    const query = { filter: { appliesToPlantId: { eq: unknownId } } };

    await useCase.execute({ query });

    expect(readRepository.findAllMock).toHaveBeenCalledWith({
      filter: { appliesTo: { plantId: unknownId } }
    });
  });

  it('annotates each relation with the matching tier and side', async () => {
    const plant = PlantReadViewMother.tomato();
    plantReadRepository.addToStorage(plant);
    const genus = deriveGenus(plant.identity.scientificName)!;
    const familyId = plant.identity.family as string;
    const other = '0192e200-0000-7000-8000-0000000000aa';

    const base = {
      type: 'beneficial' as const,
      mechanism: 'pest_repellent' as const,
      strength: 3,
      proximity: { minDistanceCm: 0, maxDistanceCm: null },
      reason: 'because',
      metadata: {
        createdAt: new Date('2026-10-28T12:00:00.000Z'),
        createdBy: 'system',
        updatedAt: new Date('2026-10-28T12:00:00.000Z'),
        updatedBy: 'system'
      },
      version: 0
    };
    const asPlantSource: PlantRelationReadView = {
      ...base,
      id: '0192e201-0000-7000-8000-0000000000a1',
      source: { scope: 'plant', value: plant.id },
      target: { scope: 'plant', value: other }
    };
    const asGenusSource: PlantRelationReadView = {
      ...base,
      id: '0192e201-0000-7000-8000-0000000000a2',
      source: { scope: 'genus', value: genus },
      target: { scope: 'plant', value: other }
    };
    const asFamilyTarget: PlantRelationReadView = {
      ...base,
      id: '0192e201-0000-7000-8000-0000000000a3',
      source: { scope: 'plant', value: other },
      target: { scope: 'family', value: familyId }
    };
    const asBroadcast: PlantRelationReadView = {
      ...base,
      id: '0192e201-0000-7000-8000-0000000000a4',
      source: { scope: 'genus', value: 'Trifolium' },
      target: { scope: 'all' }
    };
    readRepository.populate([
      asPlantSource,
      asGenusSource,
      asFamilyTarget,
      asBroadcast
    ]);

    const result = await useCase.execute({
      query: { filter: { appliesToPlantId: { eq: plant.id } } }
    });

    const byId = new Map(result.data.map((view) => [view.id, view]));
    expect(byId.get(asPlantSource.id)).toMatchObject({
      appliesVia: 'plant',
      role: 'source'
    });
    expect(byId.get(asGenusSource.id)).toMatchObject({
      appliesVia: 'genus',
      role: 'source'
    });
    expect(byId.get(asFamilyTarget.id)).toMatchObject({
      appliesVia: 'family',
      role: 'target'
    });
    expect(byId.get(asBroadcast.id)).toMatchObject({
      appliesVia: 'all',
      role: 'target'
    });
  });
});
