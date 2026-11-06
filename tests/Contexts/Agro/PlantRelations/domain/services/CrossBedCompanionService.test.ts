import { CrossBedCompanionService } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/services/CrossBedCompanionService.js';
import type { ProjectedPlant } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/services/types/ProjectedPlant.js';
import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { PlantRelationMother } from '../mothers/PlantRelationMother.js';

describe('CrossBedCompanionService', () => {
  let service: CrossBedCompanionService;

  const MARIGOLD_ID = createPlantId('0192e200-0000-7000-8000-000000000001');
  const TOMATO_ID = createPlantId('0192e200-0000-7000-8000-000000000002');

  const beneficialRule = PlantRelationMother.beneficial(
    MARIGOLD_ID,
    TOMATO_ID,
    {
      proximity: ProximityDistance.create(0, 100),
      reason: 'Pest repellent synergy across beds'
    }
  );

  beforeEach(() => {
    service = new CrossBedCompanionService();
  });

  it('detects cross_bed companion relationship between plants placed in different beds within proximity', () => {
    const marigoldBedA: ProjectedPlant = {
      plantInstanceId: 'crop-marigold-1',
      plantId: MARIGOLD_ID,
      bedId: 'bed-a',
      scientificName: 'Tagetes patula',
      globalPosition: { x: 110, y: 50 },
      localPosition: { x: 110, y: 50 }
    };
    const tomatoBedB: ProjectedPlant = {
      plantInstanceId: 'crop-tomato-1',
      plantId: TOMATO_ID,
      bedId: 'bed-b',
      scientificName: 'Solanum lycopersicum',
      globalPosition: { x: 170, y: 50 },
      localPosition: { x: 10, y: 50 }
    };

    const edges = service.evaluateLayout(
      [marigoldBedA, tomatoBedB],
      [beneficialRule]
    );

    expect(edges).toHaveLength(1);
    expect(edges[0]?.sourcePlantInstanceId).toBe('crop-marigold-1');
    expect(edges[0]?.targetPlantInstanceId).toBe('crop-tomato-1');
    expect(edges[0]?.sourceBedId).toBe('bed-a');
    expect(edges[0]?.targetBedId).toBe('bed-b');
    expect(edges[0]?.scope).toBe('cross_bed');
    expect(edges[0]?.distanceCm).toBe(60);
    expect(edges[0]?.relationType).toBe('beneficial');
  });

  it('detects intra_bed companion relationship when plants are in the same bed', () => {
    const marigoldSameBed: ProjectedPlant = {
      plantInstanceId: 'crop-marigold-1',
      plantId: MARIGOLD_ID,
      bedId: 'bed-a',
      scientificName: 'Tagetes patula',
      globalPosition: { x: 20, y: 20 },
      localPosition: { x: 20, y: 20 }
    };
    const tomatoSameBed: ProjectedPlant = {
      plantInstanceId: 'crop-tomato-1',
      plantId: TOMATO_ID,
      bedId: 'bed-a',
      scientificName: 'Solanum lycopersicum',
      globalPosition: { x: 50, y: 20 },
      localPosition: { x: 50, y: 20 }
    };

    const edges = service.evaluateLayout(
      [marigoldSameBed, tomatoSameBed],
      [beneficialRule]
    );

    expect(edges).toHaveLength(1);
    expect(edges[0]?.scope).toBe('intra_bed');
    expect(edges[0]?.distanceCm).toBe(30);
  });

  it('ignores plant pairs exceeding maximum proximity distance', () => {
    const marigoldFar: ProjectedPlant = {
      plantInstanceId: 'crop-marigold-1',
      plantId: MARIGOLD_ID,
      bedId: 'bed-a',
      scientificName: 'Tagetes patula',
      globalPosition: { x: 0, y: 0 },
      localPosition: { x: 0, y: 0 }
    };
    const tomatoFar: ProjectedPlant = {
      plantInstanceId: 'crop-tomato-1',
      plantId: TOMATO_ID,
      bedId: 'bed-b',
      scientificName: 'Solanum lycopersicum',
      globalPosition: { x: 250, y: 0 },
      localPosition: { x: 50, y: 0 }
    };

    const edges = service.evaluateLayout(
      [marigoldFar, tomatoFar],
      [beneficialRule]
    );

    expect(edges).toHaveLength(0);
  });
});
