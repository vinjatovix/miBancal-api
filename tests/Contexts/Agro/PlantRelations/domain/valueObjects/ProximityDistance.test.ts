import { ProximityDistance } from '../../../../../../src/Contexts/Agro/PlantRelations/domain/valueObjects/ProximityDistance.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';

describe('ProximityDistance', () => {
  describe('create and instantiation', () => {
    it('creates an unbounded instance when maxDistanceCm is null', () => {
      const proximity = ProximityDistance.create(10, null);

      expect(proximity.minDistanceCm).toBe(10);
      expect(proximity.maxDistanceCm).toBeNull();
    });

    it('creates a bounded instance when maxDistanceCm is provided', () => {
      const proximity = ProximityDistance.create(10, 50);

      expect(proximity.minDistanceCm).toBe(10);
      expect(proximity.maxDistanceCm).toBe(50);
    });

    it('creates an instance with equal min and max distances', () => {
      const proximity = ProximityDistance.create(30, 30);

      expect(proximity.minDistanceCm).toBe(30);
      expect(proximity.maxDistanceCm).toBe(30);
    });

    it('creates an instance with zero minDistanceCm', () => {
      const proximity = ProximityDistance.create(0, 100);

      expect(proximity.minDistanceCm).toBe(0);
      expect(proximity.maxDistanceCm).toBe(100);
    });
  });

  describe('isUnbounded', () => {
    it('returns true when maxDistanceCm is null', () => {
      const proximity = ProximityDistance.create(10, null);

      const result = proximity.isUnbounded();

      expect(result).toBe(true);
    });

    it('returns false when maxDistanceCm is an integer', () => {
      const proximity = ProximityDistance.create(10, 50);

      const result = proximity.isUnbounded();

      expect(result).toBe(false);
    });
  });

  describe('invariants validation', () => {
    it.each([-1, -100, 1.5, NaN])(
      'throws InvalidArgumentException when minDistanceCm is invalid (%s)',
      (invalidMin) => {
        expect(() => ProximityDistance.create(invalidMin, 50)).toThrow(
          InvalidArgumentException
        );
      }
    );

    it.each([
      [10, 5],
      [50, 49],
      [10, 15.5]
    ])(
      'throws InvalidArgumentException when maxDistanceCm is invalid relative to minDistanceCm (%s, %s)',
      (min, invalidMax) => {
        expect(() => ProximityDistance.create(min, invalidMax)).toThrow(
          InvalidArgumentException
        );
      }
    );
  });

  describe('primitives serialization and reconstitution', () => {
    it('converts to primitives with null maxDistanceCm', () => {
      const proximity = ProximityDistance.create(15, null);

      const primitives = proximity.toPrimitives();

      expect(primitives).toEqual({
        minDistanceCm: 15,
        maxDistanceCm: null
      });
    });

    it('converts to primitives with bounded maxDistanceCm', () => {
      const proximity = ProximityDistance.create(15, 60);

      const primitives = proximity.toPrimitives();

      expect(primitives).toEqual({
        minDistanceCm: 15,
        maxDistanceCm: 60
      });
    });

    it('reconstitutes from primitives with null maxDistanceCm', () => {
      const primitives = { minDistanceCm: 20, maxDistanceCm: null };

      const proximity = ProximityDistance.fromPrimitives(primitives);

      expect(proximity.minDistanceCm).toBe(20);
      expect(proximity.maxDistanceCm).toBeNull();
    });

    it('reconstitutes from primitives with bounded maxDistanceCm', () => {
      const primitives = { minDistanceCm: 20, maxDistanceCm: 80 };

      const proximity = ProximityDistance.fromPrimitives(primitives);

      expect(proximity.minDistanceCm).toBe(20);
      expect(proximity.maxDistanceCm).toBe(80);
    });
  });

  describe('isWithinRange', () => {
    it.each([
      ['distance is less than minDistanceCm', 19, false],
      ['distance equals minDistanceCm', 20, true],
      ['distance is between min and max distance', 35, true],
      ['distance equals maxDistanceCm', 50, true],
      ['distance exceeds maxDistanceCm', 51, false]
    ])(
      'evaluates range correctly for bounded proximity when %s (%s -> %s)',
      (_scenario, distance, expected) => {
        const proximity = ProximityDistance.create(20, 50);

        const result = proximity.isWithinRange(distance);

        expect(result).toBe(expected);
      }
    );

    it.each([
      ['distance is below minDistanceCm', 15, false],
      ['distance equals minDistanceCm', 20, true],
      ['distance is far above minDistanceCm', 1000, true]
    ])(
      'evaluates range correctly for unbounded proximity when %s (%s -> %s)',
      (_scenario, distance, expected) => {
        const proximity = ProximityDistance.create(20, null);

        const result = proximity.isWithinRange(distance);

        expect(result).toBe(expected);
      }
    );

    it.each([
      ['negative distance', -1],
      ['negative distance below zero', -50],
      ['NaN distance', NaN]
    ])(
      'returns false when distance is non-numeric or negative (%s)',
      (_scenario, invalidDistance) => {
        const proximity = ProximityDistance.create(20, 50);

        const result = proximity.isWithinRange(invalidDistance);

        expect(result).toBe(false);
      }
    );
  });
});
