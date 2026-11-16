import { Vector2D } from '../../../../shared/domain/spatial/Vector2D.js';

export interface OrientedBoundingBox {
  readonly vertices: [Vector2D, Vector2D, Vector2D, Vector2D];
}
