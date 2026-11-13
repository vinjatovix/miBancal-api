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
    it('sets north angle and updates audit metadata', () => {
      const location = Location.create(defaultProps);
      const updateTime = new Date();

      location.updateSpatialCanvas({ northAngle: 45 }, 'test-user', updateTime);

      expect(location.northAngle).toBe(45);
      expect(location.metadata.updatedBy).toBe('test-user');
      expect(location.metadata.updatedAt).toEqual(updateTime);
    });

    it('clears north angle when null is provided', () => {
      const location = Location.create({
        ...defaultProps,
        northAngle: 45
      });
      const updateTime = new Date();

      location.updateSpatialCanvas(
        { northAngle: null },
        'test-user',
        updateTime
      );

      expect(location.northAngle).toBeUndefined();
      expect(location.metadata.updatedBy).toBe('test-user');
      expect(location.metadata.updatedAt).toEqual(updateTime);
    });

    it('is a no-op when north angle does not change', () => {
      const location = Location.create({
        ...defaultProps,
        northAngle: 45
      });
      const before = location.metadata.updatedAt;

      location.updateSpatialCanvas(
        { northAngle: 45 },
        'test-user',
        new Date(before.getTime() + 1000)
      );

      expect(location.metadata.updatedAt).toEqual(before);
    });

    it('throws InvalidArgumentException when north angle is out of bounds', () => {
      const location = Location.create(defaultProps);

      const updateAction = () =>
        location.updateSpatialCanvas(
          { northAngle: 400 },
          'test-user',
          new Date()
        );

      expect(updateAction).toThrow(InvalidArgumentException);
    });
  });
});
