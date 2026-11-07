import { BedCollisionDetector } from '../../../../../../../src/Contexts/Agro/Beds/domain/services/spatial/BedCollisionDetector.js';

describe('BedCollisionDetector', () => {
  describe('getOBB', () => {
    it('should generate unrotated OBB correctly', () => {
      const obb = BedCollisionDetector.getOBB({ x: 10, y: 20 }, 100, 50, 0);
      expect(obb.vertices[0].x).toBeCloseTo(10);
      expect(obb.vertices[0].y).toBeCloseTo(20);

      expect(obb.vertices[1].x).toBeCloseTo(110);
      expect(obb.vertices[1].y).toBeCloseTo(20);

      expect(obb.vertices[2].x).toBeCloseTo(110);
      expect(obb.vertices[2].y).toBeCloseTo(70);

      expect(obb.vertices[3].x).toBeCloseTo(10);
      expect(obb.vertices[3].y).toBeCloseTo(70);
    });

    it('should generate rotated OBB correctly (90 degrees)', () => {
      const obb = BedCollisionDetector.getOBB({ x: 10, y: 20 }, 100, 50, 90);
      expect(obb.vertices[0].x).toBeCloseTo(10);
      expect(obb.vertices[0].y).toBeCloseTo(20);
      expect(obb.vertices[1].x).toBeCloseTo(10);
      expect(obb.vertices[1].y).toBeCloseTo(120);
      expect(obb.vertices[2].x).toBeCloseTo(-40);
      expect(obb.vertices[2].y).toBeCloseTo(120);
      expect(obb.vertices[3].x).toBeCloseTo(-40);
      expect(obb.vertices[3].y).toBeCloseTo(20);
    });

    it('should generate unrotated OBB correctly at negative coordinates', () => {
      const obb = BedCollisionDetector.getOBB({ x: -100, y: -50 }, 100, 50, 0);
      expect(obb.vertices[0].x).toBeCloseTo(-100);
      expect(obb.vertices[0].y).toBeCloseTo(-50);
      expect(obb.vertices[1].x).toBeCloseTo(0);
      expect(obb.vertices[1].y).toBeCloseTo(-50);
      expect(obb.vertices[2].x).toBeCloseTo(0);
      expect(obb.vertices[2].y).toBeCloseTo(0);
      expect(obb.vertices[3].x).toBeCloseTo(-100);
      expect(obb.vertices[3].y).toBeCloseTo(0);
    });
  });

  describe('checkCollision', () => {
    it.each([
      [{ x: 0, y: 0 }, 10, 10, 0, { x: 20, y: 0 }, 10, 10, 0, false],
      [{ x: 0, y: 0 }, 10, 10, 0, { x: 10, y: 0 }, 10, 10, 0, false],
      [{ x: 0, y: 0 }, 10, 10, 0, { x: 5, y: 5 }, 10, 10, 0, true],
      [{ x: 0, y: 0 }, 20, 20, 0, { x: 5, y: 5 }, 5, 5, 0, true],
      [{ x: 0, y: 0 }, 10, 10, 45, { x: 20, y: 0 }, 10, 10, 45, false],
      [{ x: 0, y: 0 }, 10, 10, 45, { x: 7, y: 7 }, 10, 10, 45, true],
      [{ x: 0, y: 0 }, 10, 10, 0, { x: 9, y: 9 }, 10, 10, 0, true],
      [{ x: 0, y: 0 }, 10, 10, 0, { x: 10.01, y: 10.01 }, 10, 10, 0, false],
      [{ x: -100, y: -100 }, 50, 50, 0, { x: -80, y: -80 }, 50, 50, 0, true],
      [{ x: -100, y: -100 }, 50, 50, 0, { x: -40, y: -40 }, 50, 50, 0, false],
      [{ x: -30, y: -30 }, 50, 50, 0, { x: 10, y: 10 }, 50, 50, 0, true],
      [{ x: -50, y: 10 }, 50, 50, 0, { x: 10, y: 10 }, 50, 50, 0, false]
    ])(
      'should detect collision between obb1 and obb2 correctly',
      (p1, w1, h1, r1, p2, w2, h2, r2, expected) => {
        const obb1 = BedCollisionDetector.getOBB(p1, w1, h1, r1);
        const obb2 = BedCollisionDetector.getOBB(p2, w2, h2, r2);
        expect(BedCollisionDetector.checkCollision(obb1, obb2)).toBe(expected);
      }
    );
  });
});
