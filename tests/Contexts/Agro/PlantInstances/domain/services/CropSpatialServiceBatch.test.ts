import { CropSpatialService } from '../../../../../../src/Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import { DomainConflictException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';

describe('CropSpatialService - Batch Operations', () => {
  const service = new CropSpatialService();
  const bed = { width: 100, height: 200 };

  describe('validateBatchPlacement', () => {
    it('allows valid placement of multiple non-colliding crops within bounds', () => {
      const items = [
        { itemIndex: 0, position: { x: 20, y: 20 }, vitalRadiusCm: 10 },
        { itemIndex: 1, position: { x: 50, y: 50 }, vitalRadiusCm: 10 },
        { itemIndex: 2, position: { x: 80, y: 80 }, vitalRadiusCm: 10 }
      ];
      const existingCrops = [
        { id: 'existing-1', position: { x: 90, y: 150 }, vitalRadiusCm: 10 }
      ];

      expect(() =>
        service.validateBatchPlacement({ bed, items, existingCrops })
      ).not.toThrow();
    });

    it.each([
      [-5, 50, '(-5, 50)'],
      [105, 50, '(105, 50)'],
      [50, -5, '(50, -5)'],
      [50, 205, '(50, 205)']
    ])(
      'throws structured DomainConflictException when item has out of bounds coordinates (%i, %i)',
      (x, y, expectedCoords) => {
        const items = [
          { itemIndex: 0, position: { x: 20, y: 20 }, vitalRadiusCm: 10 },
          { itemIndex: 1, position: { x, y }, vitalRadiusCm: 10 }
        ];

        let thrownError: DomainConflictException | undefined;
        try {
          service.validateBatchPlacement({ bed, items, existingCrops: [] });
        } catch (error) {
          if (error instanceof DomainConflictException) {
            thrownError = error;
          }
        }

        expect(thrownError).toBeDefined();
        expect(thrownError?.message).toBe(
          'Crop position is outside bed boundaries'
        );
        expect(thrownError?.errors).toEqual({
          conflictType: 'bounds',
          itemIndex: '1',
          coordinates: expectedCoords,
          bedBounds: '100x200'
        });
      }
    );

    it('throws structured DomainConflictException when two batch items collide internally', () => {
      const items = [
        {
          itemIndex: 0,
          id: 'crop-1',
          position: { x: 20, y: 20 },
          vitalRadiusCm: 10
        },
        {
          itemIndex: 1,
          id: 'crop-2',
          position: { x: 30, y: 20 },
          vitalRadiusCm: 10
        }
      ];

      let thrownError: DomainConflictException | undefined;
      try {
        service.validateBatchPlacement({ bed, items, existingCrops: [] });
      } catch (error) {
        if (error instanceof DomainConflictException) {
          thrownError = error;
        }
      }

      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toBe(
        'Spatial collision detected within batch'
      );
      expect(thrownError?.errors).toEqual({
        conflictType: 'internal',
        itemIndex: '0',
        collidingWithIndex: '1',
        cropId: 'crop-1',
        distance: '10.00cm',
        minRequired: '20.00cm'
      });
    });

    it('throws structured DomainConflictException when a batch item collides with an existing crop', () => {
      const items = [
        {
          itemIndex: 0,
          id: 'new-crop',
          position: { x: 25, y: 20 },
          vitalRadiusCm: 10
        }
      ];
      const existingCrops = [
        { id: 'fixed-crop-1', position: { x: 30, y: 20 }, vitalRadiusCm: 10 }
      ];

      let thrownError: DomainConflictException | undefined;
      try {
        service.validateBatchPlacement({ bed, items, existingCrops });
      } catch (error) {
        if (error instanceof DomainConflictException) {
          thrownError = error;
        }
      }

      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toBe(
        'Spatial collision detected with existing crop'
      );
      expect(thrownError?.errors).toEqual({
        conflictType: 'existing',
        itemIndex: '0',
        collidingWithCropId: 'fixed-crop-1',
        cropId: 'new-crop',
        distance: '5.00cm',
        minRequired: '20.00cm'
      });
    });

    it('ignores batch items and existing crops that lack coordinates', () => {
      const items = [
        {
          itemIndex: 0,
          id: 'unplaced-item',
          position: undefined,
          vitalRadiusCm: 10
        },
        {
          itemIndex: 1,
          id: 'placed-item',
          position: { x: 50, y: 50 },
          vitalRadiusCm: 10
        }
      ];
      const existingCrops = [
        { id: 'existing-unplaced', position: undefined, vitalRadiusCm: 10 }
      ];

      expect(() =>
        service.validateBatchPlacement({ bed, items, existingCrops })
      ).not.toThrow();
    });

    it('ignores items and existing crops with vitalRadiusCm equal to or less than zero', () => {
      const items = [
        {
          itemIndex: 0,
          id: 'zero-radius-item',
          position: { x: 50, y: 50 },
          vitalRadiusCm: 0
        },
        {
          itemIndex: 1,
          id: 'overlapping-item',
          position: { x: 50, y: 50 },
          vitalRadiusCm: 10
        }
      ];
      const existingCrops = [
        { id: 'zero-existing', position: { x: 50, y: 50 }, vitalRadiusCm: 0 }
      ];

      expect(() =>
        service.validateBatchPlacement({ bed, items, existingCrops })
      ).not.toThrow();
    });
  });

  describe('validateBatchMovement', () => {
    it('allows positions swap between two batch crops without self-blocking', () => {
      const items = [
        {
          itemIndex: 0,
          id: 'crop-a',
          position: { x: 50, y: 50 },
          vitalRadiusCm: 10
        },
        {
          itemIndex: 1,
          id: 'crop-b',
          position: { x: 20, y: 20 },
          vitalRadiusCm: 10
        }
      ];
      const existingCrops = [
        { id: 'crop-a', position: { x: 20, y: 20 }, vitalRadiusCm: 10 },
        { id: 'crop-b', position: { x: 50, y: 50 }, vitalRadiusCm: 10 }
      ];

      expect(() =>
        service.validateBatchMovement({
          bed,
          items,
          existingCrops,
          excludeCropIds: new Set(['crop-a', 'crop-b'])
        })
      ).not.toThrow();
    });

    it('allows joint shift of crops where one moves to another previous position', () => {
      const items = [
        {
          itemIndex: 0,
          id: 'crop-a',
          position: { x: 40, y: 20 },
          vitalRadiusCm: 10
        },
        {
          itemIndex: 1,
          id: 'crop-b',
          position: { x: 60, y: 20 },
          vitalRadiusCm: 10
        }
      ];
      const existingCrops = [
        { id: 'crop-a', position: { x: 20, y: 20 }, vitalRadiusCm: 10 },
        { id: 'crop-b', position: { x: 40, y: 20 }, vitalRadiusCm: 10 }
      ];

      expect(() =>
        service.validateBatchMovement({
          bed,
          items,
          existingCrops,
          excludeCropIds: new Set(['crop-a', 'crop-b'])
        })
      ).not.toThrow();
    });

    it('throws structured DomainConflictException when relocated crop collides with a fixed neighbor', () => {
      const items = [
        {
          itemIndex: 0,
          id: 'moving-crop',
          position: { x: 30, y: 30 },
          vitalRadiusCm: 10
        }
      ];
      const existingCrops = [
        { id: 'moving-crop', position: { x: 80, y: 80 }, vitalRadiusCm: 10 },
        { id: 'fixed-crop', position: { x: 35, y: 30 }, vitalRadiusCm: 10 }
      ];

      let thrownError: DomainConflictException | undefined;
      try {
        service.validateBatchMovement({
          bed,
          items,
          existingCrops,
          excludeCropIds: new Set(['moving-crop'])
        });
      } catch (error) {
        if (error instanceof DomainConflictException) {
          thrownError = error;
        }
      }

      expect(thrownError).toBeDefined();
      expect(thrownError?.message).toBe(
        'Spatial collision detected with existing crop'
      );
      expect(thrownError?.errors?.conflictType).toBe('existing');
      expect(thrownError?.errors?.collidingWithCropId).toBe('fixed-crop');
    });
  });
});
