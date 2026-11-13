import { BedRotation } from '../../../../../../src/Contexts/Agro/Beds/domain/valueObjects/BedRotation.js';
import { NorthAngle } from '../../../../../../src/Contexts/Agro/Locations/domain/valueObjects/NorthAngle.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';

describe('Spatial Value Objects', () => {
  describe('NorthAngle', () => {
    it.each([0, 45, 90, 180, 270, 359])(
      'creates valid NorthAngle for %s degrees',
      (angle) => {
        const northAngle = new NorthAngle(angle);

        expect(northAngle.value).toBe(angle);
      }
    );

    it.each([-1, 360, 400])(
      'throws InvalidArgumentException for out of bounds angle %s',
      (angle) => {
        const createAction = () => new NorthAngle(angle);

        expect(createAction).toThrow(InvalidArgumentException);
        expect(createAction).toThrow(
          'North angle must be between 0 and 359 degrees'
        );
      }
    );

    it.each([45.5, Number.NaN, Number.POSITIVE_INFINITY])(
      'throws InvalidArgumentException for non-integer angle %s',
      (angle) => {
        const createAction = () => new NorthAngle(angle);

        expect(createAction).toThrow(InvalidArgumentException);
        expect(createAction).toThrow('North angle must be an integer');
      }
    );

    describe('assertValid', () => {
      it.each([0, 45, 90, 180, 270, 359])(
        'accepts valid NorthAngle for %s degrees without throwing',
        (angle) => {
          const assertAction = () => NorthAngle.assertValid(angle);

          expect(assertAction).not.toThrow();
        }
      );

      it.each([-1, 360, 400])(
        'throws InvalidArgumentException for out of bounds angle %s',
        (angle) => {
          const assertAction = () => NorthAngle.assertValid(angle);

          expect(assertAction).toThrow(
            'North angle must be between 0 and 359 degrees'
          );
        }
      );

      it.each([45.5, Number.NaN, Number.POSITIVE_INFINITY])(
        'throws InvalidArgumentException for non-integer angle %s',
        (angle) => {
          const assertAction = () => NorthAngle.assertValid(angle);

          expect(assertAction).toThrow('North angle must be an integer');
        }
      );
    });
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
    ])('normalizes input %s to %s degrees', (input, expected) => {
      const rotation = new BedRotation(input);

      expect(rotation.value).toBe(expected);
    });

    it.each([90.5, Number.NaN, Number.POSITIVE_INFINITY])(
      'throws InvalidArgumentException for non-integer rotation %s',
      (input) => {
        const createAction = () => new BedRotation(input);

        expect(createAction).toThrow(InvalidArgumentException);
        expect(createAction).toThrow('Bed rotation must be an integer');
      }
    );
  });
});
