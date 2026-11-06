import { BedRotation } from '../../../../../../src/Contexts/Agro/Beds/domain/valueObjects/BedRotation.js';
import { CanvasDimensions } from '../../../../../../src/Contexts/Agro/Locations/domain/valueObjects/CanvasDimensions.js';
import { NorthAngle } from '../../../../../../src/Contexts/Agro/Locations/domain/valueObjects/NorthAngle.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';

describe('Spatial Value Objects', () => {
  describe('NorthAngle', () => {
    it.each([0, 45, 90, 180, 270, 359])(
      'should create valid NorthAngle for %s degrees',
      (angle) => {
        const northAngle = new NorthAngle(angle);
        expect(northAngle.value).toBe(angle);
      }
    );

    it.each([-1, 360, 400])(
      'should throw InvalidArgumentException for out of bounds angle %s',
      (angle) => {
        expect(() => new NorthAngle(angle)).toThrow(InvalidArgumentException);
        expect(() => new NorthAngle(angle)).toThrow(
          'North angle must be between 0 and 359 degrees'
        );
      }
    );

    it.each([45.5, NaN, Infinity])(
      'should throw InvalidArgumentException for non-integer angle %s',
      (angle) => {
        expect(() => new NorthAngle(angle)).toThrow(InvalidArgumentException);
        expect(() => new NorthAngle(angle)).toThrow(
          'North angle must be an integer'
        );
      }
    );
  });

  describe('CanvasDimensions', () => {
    it.each([
      [100, 200],
      [0.5, 0.5],
      [1000, 1000]
    ])(
      'should create valid CanvasDimensions for width %s and height %s',
      (width, height) => {
        const dims = new CanvasDimensions(width, height);
        expect(dims.width).toBe(width);
        expect(dims.height).toBe(height);
      }
    );

    it.each([
      [0, 100],
      [-10, 100],
      [NaN, 100],
      [Infinity, 100]
    ])(
      'should throw InvalidArgumentException for invalid width %s',
      (width, height) => {
        expect(() => new CanvasDimensions(width, height)).toThrow(
          InvalidArgumentException
        );
        expect(() => new CanvasDimensions(width, height)).toThrow(
          'Canvas width must be greater than 0'
        );
      }
    );

    it.each([
      [100, 0],
      [100, -10],
      [100, NaN],
      [100, Infinity]
    ])(
      'should throw InvalidArgumentException for invalid height %s',
      (width, height) => {
        expect(() => new CanvasDimensions(width, height)).toThrow(
          InvalidArgumentException
        );
        expect(() => new CanvasDimensions(width, height)).toThrow(
          'Canvas height must be greater than 0'
        );
      }
    );
  });

  describe('BedRotation', () => {
    it.each([
      [0, 0],
      [90, 90],
      [359, 359],
      [360, 0],
      [450, 90],
      [-90, 270],
      [-360, 0],
      [-450, 270]
    ])('should normalize input %s to %s degrees', (input, expected) => {
      const rotation = new BedRotation(input);
      expect(rotation.value).toBe(expected);
    });

    it.each([90.5, NaN, Infinity])(
      'should throw InvalidArgumentException for non-integer rotation %s',
      (input) => {
        expect(() => new BedRotation(input)).toThrow(InvalidArgumentException);
        expect(() => new BedRotation(input)).toThrow(
          'Bed rotation must be an integer'
        );
      }
    );
  });
});
