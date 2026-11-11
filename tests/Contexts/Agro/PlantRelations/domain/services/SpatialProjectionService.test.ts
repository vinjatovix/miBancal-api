import { SpatialProjectionService } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/services/SpatialProjectionService.js';

describe('SpatialProjectionService', () => {
  let service: SpatialProjectionService;

  beforeEach(() => {
    service = new SpatialProjectionService();
  });

  it('projects local point identically when bed is at origin with zero rotation', () => {
    const projected = service.projectPoint({ x: 10, y: 20 }, { x: 0, y: 0 }, 0);

    expect(projected).toEqual({ x: 10, y: 20 });
  });

  it('translates local point by bed origin offset when unrotated', () => {
    const projected = service.projectPoint(
      { x: 15, y: 25 },
      { x: 100, y: 200 },
      0
    );

    expect(projected).toEqual({ x: 115, y: 225 });
  });

  it('rotates point 90 degrees clockwise around bed origin', () => {
    const projected = service.projectPoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);

    expect(projected.x).toBeCloseTo(0);
    expect(projected.y).toBeCloseTo(10);
  });

  it('rotates point 180 degrees clockwise around bed origin', () => {
    const projected = service.projectPoint(
      { x: 10, y: 20 },
      { x: 100, y: 100 },
      180
    );

    expect(projected.x).toBeCloseTo(90);
    expect(projected.y).toBeCloseTo(80);
  });

  it('projects Marigold in Bed A and Tomato in Bed B with exact 60 cm distance across aisle', () => {
    const marigold = service.projectPlant({
      plantInstanceId: 'crop-marigold',
      plantId: 'plant-marigold',
      bedId: 'bed-a',
      scientificName: 'Tagetes patula',
      localCoordinates: { x: 110, y: 50 },
      bedPosition: { x: 0, y: 0 },
      bedRotation: 0
    });
    const tomato = service.projectPlant({
      plantInstanceId: 'crop-tomato',
      plantId: 'plant-tomato',
      bedId: 'bed-b',
      scientificName: 'Solanum lycopersicum',
      localCoordinates: { x: 10, y: 50 },
      bedPosition: { x: 160, y: 0 }
    });

    expect(marigold.globalPosition).toEqual({ x: 110, y: 50 });
    expect(tomato.globalPosition).toEqual({ x: 170, y: 50 });

    const dx = tomato.globalPosition.x - marigold.globalPosition.x;
    const dy = tomato.globalPosition.y - marigold.globalPosition.y;
    const distance = Math.hypot(dx, dy);

    expect(distance).toBe(60);
  });
});
