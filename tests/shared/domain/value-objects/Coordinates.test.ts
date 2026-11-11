import { Coordinates } from '../../../../src/shared/domain/value-objects/Coordinates.js';

describe('Coordinates', () => {
  it('should create valid coordinates', () => {
    const coord = new Coordinates(10, 20);

    expect(coord.x).toBe(10);
    expect(coord.y).toBe(20);
  });

  it('should throw if values are not finite', () => {
    expect(() => new Coordinates(Number.NaN, 10)).toThrow();
    expect(() => new Coordinates(10, Infinity)).toThrow();
  });

  it('should calculate distance correctly', () => {
    const a = new Coordinates(0, 0);
    const b = new Coordinates(3, 4);

    expect(a.distanceTo(b)).toBe(5);
  });

  it.each([
    [0, 0, 3, 4, 5],
    [1, 1, 4, 5, 5],
    [0, 0, 0, 0, 0],
    [-3, -4, 0, 0, 5],
    [10, 20, 10, 20, 0]
  ])(
    'calculates Euclidean distance from (%s, %s) to (%s, %s) as %s',
    (x1, y1, x2, y2, expected) => {
      const a = new Coordinates(x1, y1);
      const b = new Coordinates(x2, y2);

      const distance = a.distanceTo(b);

      expect(distance).toBe(expected);
    }
  );

  it('should be symmetric', () => {
    const a = new Coordinates(10, 10);
    const b = new Coordinates(20, 20);

    expect(a.distanceTo(b)).toBe(b.distanceTo(a));
  });

  it('should check equality correctly', () => {
    const a = new Coordinates(5, 5);
    const b = new Coordinates(5, 5);
    const c = new Coordinates(5, 6);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
