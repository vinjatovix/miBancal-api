import type { Point2D } from './types/Vector2DPrimitives.js';

export class Vector2D {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {}

  static fromPoint(point: Point2D): Vector2D {
    return new Vector2D(point.x, point.y);
  }

  add(other: Vector2D): Vector2D {
    return new Vector2D(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2D): Vector2D {
    return new Vector2D(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  dot(other: Vector2D): number {
    return this.x * other.x + this.y * other.y;
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  distanceTo(other: Point2D): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  normalize(): Vector2D {
    const mag = this.magnitude();
    if (mag === 0) return new Vector2D(0, 0);
    return new Vector2D(this.x / mag, this.y / mag);
  }

  rotate(degrees: number): Vector2D {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    // Provide rounding to avoid floating point errors close to 0 like 6.123233995736766e-17
    const rx = this.x * cos - this.y * sin;
    const ry = this.x * sin + this.y * cos;

    return new Vector2D(
      Math.abs(rx) < 1e-10 ? 0 : rx,
      Math.abs(ry) < 1e-10 ? 0 : ry
    );
  }

  rotateAround(origin: Point2D, degrees: number): Vector2D {
    const translated = this.subtract(Vector2D.fromPoint(origin));
    const rotated = translated.rotate(degrees);
    return rotated.add(Vector2D.fromPoint(origin));
  }

  toPoint(): Point2D {
    return { x: this.x, y: this.y };
  }
}
