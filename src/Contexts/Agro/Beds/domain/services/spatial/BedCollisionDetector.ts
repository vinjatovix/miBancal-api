import { Vector2D } from '../../../../shared/domain/spatial/Vector2D.js';
import type { BedPosition } from '../../entities/types/BedPosition.js';
import type { OrientedBoundingBox } from '../types/OrientedBoundingBox.js';

export class BedCollisionDetector {
  /**
   * Generates the Oriented Bounding Box for a bed.
   * Origin (0,0) is at the top-left before rotation. Rotation is clockwise.
   */
  static getOBB(
    position: BedPosition,
    width: number,
    height: number,
    rotationDegrees: number
  ): OrientedBoundingBox {
    // 1. Define initial vertices relative to origin (top-left) based on standard 2D graphics coords
    const localVertices = [
      new Vector2D(0, 0), // Top-Left
      new Vector2D(width, 0), // Top-Right
      new Vector2D(width, height), // Bottom-Right
      new Vector2D(0, height) // Bottom-Left
    ];

    // 2. Rotate each vertex around the origin (0,0)
    const rotatedVertices = localVertices.map((v) => v.rotate(rotationDegrees));

    // 3. Translate to the global position
    const globalPosition = new Vector2D(position.x, position.y);
    const globalVertices = rotatedVertices.map((v) => v.add(globalPosition));

    return {
      vertices: globalVertices as [Vector2D, Vector2D, Vector2D, Vector2D]
    };
  }

  /**
   * Uses Separating Axis Theorem (SAT) to check collision between two OBBs.
   * Returns true if there IS a collision, false if they are disjoint.
   */
  static checkCollision(
    obb1: OrientedBoundingBox,
    obb2: OrientedBoundingBox
  ): boolean {
    const polys: Vector2D[][] = [obb1.vertices, obb2.vertices];

    for (const poly of polys) {
      for (let j = 0; j < poly.length; j++) {
        const p1 = poly[j];
        const p2 = poly[(j + 1) % poly.length];
        if (!p1 || !p2) continue;

        // Edge vector
        const edge = p2.subtract(p1);
        // Normal vector (perpendicular)
        const normal = new Vector2D(-edge.y, edge.x).normalize();

        // Project both polygons onto the normal
        const [minA, maxA] = BedCollisionDetector.projectPolygon(
          obb1.vertices,
          normal
        );
        const [minB, maxB] = BedCollisionDetector.projectPolygon(
          obb2.vertices,
          normal
        );

        // Calculate overlap (with small tolerance for edge-touching, which shouldn't count as overlap)
        if (maxA <= minB + 1e-8 || maxB <= minA + 1e-8) {
          // Found a separating axis, no collision
          return false;
        }
      }
    }

    // No separating axis found, they must be colliding
    return true;
  }

  private static projectPolygon(
    vertices: Vector2D[],
    axis: Vector2D
  ): [number, number] {
    const v0 = vertices[0];
    if (!v0) return [0, 0];
    let min = axis.dot(v0);
    let max = min;
    for (let i = 1; i < vertices.length; i++) {
      const vi = vertices[i];
      if (!vi) continue;
      const p = axis.dot(vi);
      if (p < min) {
        min = p;
      } else if (p > max) {
        max = p;
      }
    }
    return [min, max];
  }
}
