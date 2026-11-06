import { Location } from '../../../../../../src/Contexts/Agro/Locations/domain/entities/Location.js';
import type { LocationProps } from '../../../../../../src/Contexts/Agro/Locations/domain/entities/types/LocationProps.js';
import { createLocationId } from '../../../../../../src/Contexts/Agro/Locations/domain/LocationId.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';

describe('Location Spatial Configuration', () => {
  const defaultProps: LocationProps = {
    id: createLocationId('123e4567-e89b-12d3-a456-426614174000'),
    userId: createUserId('123e4567-e89b-12d3-a456-426614174001'),
    name: 'My Garden',
    metadata: Metadata.create('test-user', new Date())
  };

  describe('updateSpatialCanvas', () => {
    it('should set canvas dimensions and north angle', () => {
      const location = Location.create(defaultProps);

      location.updateSpatialCanvas(
        { canvasWidth: 1000, canvasHeight: 1500, northAngle: 45 },
        'test-user',
        new Date()
      );

      expect(location.canvasWidth).toBe(1000);
      expect(location.canvasHeight).toBe(1500);
      expect(location.northAngle).toBe(45);
    });

    it('should clear spatial properties when exactly null is provided', () => {
      const location = Location.create({
        ...defaultProps,
        canvasWidth: 1000,
        canvasHeight: 1500,
        northAngle: 45
      });

      location.updateSpatialCanvas(
        { canvasWidth: null, canvasHeight: null, northAngle: null },
        'test-user',
        new Date()
      );

      expect(location.canvasWidth).toBeUndefined();
      expect(location.canvasHeight).toBeUndefined();
      expect(location.northAngle).toBeUndefined();
    });

    it('should throw if setting height without width', () => {
      const location = Location.create(defaultProps);

      expect(() => {
        location.updateSpatialCanvas(
          { canvasWidth: null, canvasHeight: 1500, northAngle: 45 },
          'test-user',
          new Date()
        );
      }).toThrow(InvalidArgumentException);
    });

    it('should throw if setting width without height', () => {
      const location = Location.create(defaultProps);

      expect(() => {
        location.updateSpatialCanvas(
          { canvasWidth: 1500, canvasHeight: null, northAngle: 45 },
          'test-user',
          new Date()
        );
      }).toThrow(InvalidArgumentException);
    });

    it('should preserve canvas dimensions when only north angle is updated', () => {
      const location = Location.create({
        ...defaultProps,
        canvasWidth: 1000,
        canvasHeight: 1500,
        northAngle: 45
      });

      location.updateSpatialCanvas({ northAngle: 90 }, 'test-user', new Date());

      expect(location.canvasWidth).toBe(1000);
      expect(location.canvasHeight).toBe(1500);
      expect(location.northAngle).toBe(90);
    });

    it('should preserve north angle when only canvas dimensions are updated', () => {
      const location = Location.create({
        ...defaultProps,
        canvasWidth: 1000,
        canvasHeight: 1500,
        northAngle: 45
      });

      location.updateSpatialCanvas(
        { canvasWidth: 2000, canvasHeight: 3000 },
        'test-user',
        new Date()
      );

      expect(location.canvasWidth).toBe(2000);
      expect(location.canvasHeight).toBe(3000);
      expect(location.northAngle).toBe(45);
    });

    it('should clear canvas dimensions while preserving north angle when dimensions are explicitly null', () => {
      const location = Location.create({
        ...defaultProps,
        canvasWidth: 1000,
        canvasHeight: 1500,
        northAngle: 45
      });

      location.updateSpatialCanvas(
        { canvasWidth: null, canvasHeight: null },
        'test-user',
        new Date()
      );

      expect(location.canvasWidth).toBeUndefined();
      expect(location.canvasHeight).toBeUndefined();
      expect(location.northAngle).toBe(45);
    });

    it('should clear north angle while preserving canvas dimensions when north angle is explicitly null', () => {
      const location = Location.create({
        ...defaultProps,
        canvasWidth: 1000,
        canvasHeight: 1500,
        northAngle: 45
      });

      location.updateSpatialCanvas(
        { northAngle: null },
        'test-user',
        new Date()
      );

      expect(location.canvasWidth).toBe(1000);
      expect(location.canvasHeight).toBe(1500);
      expect(location.northAngle).toBeUndefined();
    });
  });
});
