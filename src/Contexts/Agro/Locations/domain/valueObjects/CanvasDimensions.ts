import { InvalidArgumentException } from '../../../../shared/domain/errors/InvalidArgumentException.js';

export class CanvasDimensions {
  constructor(
    public readonly width: number,
    public readonly height: number
  ) {
    if (!Number.isFinite(width) || width <= 0) {
      throw new InvalidArgumentException('Canvas width must be greater than 0');
    }
    if (!Number.isFinite(height) || height <= 0) {
      throw new InvalidArgumentException(
        'Canvas height must be greater than 0'
      );
    }
  }
}
