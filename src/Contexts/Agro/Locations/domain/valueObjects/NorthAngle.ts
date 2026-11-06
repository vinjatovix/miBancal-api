import { InvalidArgumentException } from '../../../../shared/domain/errors/InvalidArgumentException.js';

export class NorthAngle {
  constructor(public readonly value: number) {
    if (!Number.isInteger(value)) {
      throw new InvalidArgumentException('North angle must be an integer');
    }
    if (value < 0 || value > 359) {
      throw new InvalidArgumentException(
        'North angle must be between 0 and 359 degrees'
      );
    }
  }
}
