import { Vector2D } from '../../../../../../src/Contexts/Agro/shared/domain/spatial/Vector2D.js';

describe('Vector2D', () => {
  describe('basic operations', () => {
    it.each([
      [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 4, y: 6 }
      ],
      [
        { x: -1, y: -2 },
        { x: 1, y: 2 },
        { x: 0, y: 0 }
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ]
    ])('should add two vectors: %j + %j = %j', (a, b, expected) => {
      const v1 = new Vector2D(a.x, a.y);
      const v2 = new Vector2D(b.x, b.y);
      const result = v1.add(v2);
      expect(result.x).toBe(expected.x);
      expect(result.y).toBe(expected.y);
    });

    it.each([
      [
        { x: 3, y: 4 },
        { x: 1, y: 2 },
        { x: 2, y: 2 }
      ],
      [
        { x: -1, y: -2 },
        { x: 1, y: 2 },
        { x: -2, y: -4 }
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ]
    ])('should subtract two vectors: %j - %j = %j', (a, b, expected) => {
      const v1 = new Vector2D(a.x, a.y);
      const v2 = new Vector2D(b.x, b.y);
      const result = v1.subtract(v2);
      expect(result.x).toBe(expected.x);
      expect(result.y).toBe(expected.y);
    });

    it.each([
      [{ x: 2, y: 3 }, 2, { x: 4, y: 6 }],
      [{ x: -1, y: -2 }, -3, { x: 3, y: 6 }],
      [{ x: 5, y: 5 }, 0, { x: 0, y: 0 }]
    ])(
      'should multiply a vector by a scalar: %j * %s = %j',
      (a, scalar, expected) => {
        const v1 = new Vector2D(a.x, a.y);
        const result = v1.multiply(scalar);
        expect(result.x).toBe(expected.x);
        expect(result.y).toBe(expected.y);
      }
    );

    it.each([
      [{ x: 3, y: 4 }, 5],
      [{ x: -3, y: 4 }, 5],
      [{ x: 0, y: 0 }, 0]
    ])(
      'should calculate the magnitude of vector %j to be %s',
      (a, expected) => {
        const v1 = new Vector2D(a.x, a.y);
        expect(v1.magnitude()).toBe(expected);
      }
    );

    it.each([
      [{ x: 0, y: 0 }, { x: 3, y: 4 }, 5],
      [{ x: 1, y: 1 }, { x: 4, y: 5 }, 5],
      [{ x: 0, y: 0 }, { x: 0, y: 0 }, 0]
    ])(
      'should calculate the distance from %j to %j as %s',
      (a, b, expected) => {
        const v1 = new Vector2D(a.x, a.y);
        expect(v1.distanceTo(b)).toBe(expected);
      }
    );

    it.each([
      [{ x: 2, y: 3 }, { x: 4, y: 5 }, 2 * 4 + 3 * 5],
      [{ x: -1, y: 2 }, { x: 3, y: -4 }, -1 * 3 + 2 * -4],
      [{ x: 0, y: 0 }, { x: 1, y: 1 }, 0]
    ])(
      'should calculate the dot product of %j and %j as %s',
      (a, b, expected) => {
        const v1 = new Vector2D(a.x, a.y);
        const v2 = new Vector2D(b.x, b.y);
        expect(v1.dot(v2)).toBe(expected);
      }
    );
  });

  describe('rotations', () => {
    it.each([
      [{ x: 1, y: 0 }, 90, { x: 0, y: 1 }],
      [{ x: 1, y: 0 }, 180, { x: -1, y: 0 }],
      [{ x: 1, y: 0 }, 270, { x: 0, y: -1 }],
      [{ x: 1, y: 0 }, 360, { x: 1, y: 0 }],
      [{ x: 0, y: 1 }, 90, { x: -1, y: 0 }]
    ])(
      'should rotate vector %j by %s degrees to %j',
      (a, degrees, expected) => {
        const v1 = new Vector2D(a.x, a.y);
        const result = v1.rotate(degrees);
        expect(result.x).toBeCloseTo(expected.x, 5);
        expect(result.y).toBeCloseTo(expected.y, 5);
      }
    );

    it.each([
      [{ x: 2, y: 0 }, { x: 1, y: 0 }, 90, { x: 1, y: 1 }],
      [{ x: 2, y: 2 }, { x: 1, y: 1 }, 180, { x: 0, y: 0 }]
    ])(
      'should rotate vector %j around %j by %s degrees to %j',
      (a, origin, degrees, expected) => {
        const v1 = new Vector2D(a.x, a.y);
        const result = v1.rotateAround(origin, degrees);
        expect(result.x).toBeCloseTo(expected.x, 5);
        expect(result.y).toBeCloseTo(expected.y, 5);
      }
    );
  });

  describe('utilities', () => {
    it('should create a Vector2D from a Point2D', () => {
      const point = { x: 10, y: 20 };
      const vector = Vector2D.fromPoint(point);
      expect(vector.x).toBe(10);
      expect(vector.y).toBe(20);
    });

    it('should convert a Vector2D to a Point2D', () => {
      const vector = new Vector2D(15, 25);
      const point = vector.toPoint();
      expect(point).toEqual({ x: 15, y: 25 });
    });

    it('should normalize a vector', () => {
      const vector = new Vector2D(3, 4);
      const result = vector.normalize();
      expect(result.x).toBe(3 / 5);
      expect(result.y).toBe(4 / 5);
    });

    it('should return 0,0 when normalizing a 0,0 vector', () => {
      const vector = new Vector2D(0, 0);
      const result = vector.normalize();
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });
});
