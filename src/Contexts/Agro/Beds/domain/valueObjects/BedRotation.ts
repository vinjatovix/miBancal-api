import { InvalidArgumentException } from '../../../../shared/domain/errors/InvalidArgumentException.js';

export class BedRotation {
  public readonly value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new InvalidArgumentException('Bed rotation must be an integer');
    }

    // Normalize to [0, 359]
    const normalized = value % 360;
    this.value = normalized < 0 ? normalized + 360 : Math.abs(normalized);
  }
}
