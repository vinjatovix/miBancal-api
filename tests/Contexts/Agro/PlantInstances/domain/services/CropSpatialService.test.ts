import { CropSpatialService } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';

describe('CropSpatialService', () => {
  const service = new CropSpatialService();
  const bed = { width: 100, height: 200 };

  it('allows placement within bed boundaries and away from existing crops', () => {
    const proposed = {
      position: { x: 50, y: 50 },
      vitalRadiusCm: 10
    };
    const existingCrops = [
      {
        id: 'crop-1',
        position: { x: 10, y: 10 },
        vitalRadiusCm: 10
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).not.toThrow();
  });

  it.each([
    [-1, 50],
    [101, 50],
    [50, -1],
    [50, 201]
  ])(
    'throws DomainConflictException when coordinates (%i, %i) are out of bounds',
    (x, y) => {
      const proposed = {
        position: { x, y },
        vitalRadiusCm: 10
      };

      expect(() =>
        service.validatePlacement({ bed, proposed, existingCrops: [] })
      ).toThrow(DomainConflictException);
    }
  );

  it('allows placement exactly on bed edges', () => {
    const proposed = {
      position: { x: 0, y: 200 },
      vitalRadiusCm: 5
    };

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops: [] })
    ).not.toThrow();
  });

  it('does not collide when centers are exactly the sum of vital radii apart', () => {
    const proposed = {
      position: { x: 50, y: 50 },
      vitalRadiusCm: 15
    };
    const existingCrops = [
      {
        id: 'crop-1',
        position: { x: 90, y: 50 },
        vitalRadiusCm: 25
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).not.toThrow();
  });

  it('collides when vital circles strictly overlap', () => {
    const proposed = {
      position: { x: 50, y: 50 },
      vitalRadiusCm: 15
    };
    const existingCrops = [
      {
        id: 'crop-1',
        position: { x: 89, y: 50 },
        vitalRadiusCm: 25
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).toThrow(DomainConflictException);
  });

  it('accepts the reported real case (radii 25 and 15, centers 40.32cm apart)', () => {
    const proposed = {
      position: { x: 50, y: 50 },
      vitalRadiusCm: 15
    };
    const existingCrops = [
      {
        id: 'tomato',
        position: { x: 90.32, y: 50 },
        vitalRadiusCm: 25
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).not.toThrow();
  });

  it('ignores existing crops without coordinates', () => {
    const proposed = {
      position: { x: 20, y: 20 },
      vitalRadiusCm: 25
    };
    const existingCrops = [
      {
        id: 'crop-no-pos',
        position: undefined,
        vitalRadiusCm: 25
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).not.toThrow();
  });

  it('does not collide with a neighbor whose vital radius is 0', () => {
    const proposed = {
      position: { x: 20, y: 20 },
      vitalRadiusCm: 5
    };
    const existingCrops = [
      {
        id: 'missing-plant',
        position: { x: 22, y: 20 },
        vitalRadiusCm: 0
      }
    ];

    expect(() =>
      service.validatePlacement({ bed, proposed, existingCrops })
    ).not.toThrow();
  });

  it('ignores the crop itself when an excludedCropId is supplied during movement', () => {
    const proposed = {
      position: { x: 20, y: 20 },
      vitalRadiusCm: 12.5
    };
    const existingCrops = [
      {
        id: 'self-crop',
        position: { x: 20, y: 20 },
        vitalRadiusCm: 12.5
      }
    ];

    expect(() =>
      service.validatePlacement({
        bed,
        proposed,
        existingCrops,
        excludeCropId: 'self-crop'
      })
    ).not.toThrow();
  });
});
