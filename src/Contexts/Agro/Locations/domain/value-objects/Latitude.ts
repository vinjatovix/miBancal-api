import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';

export class Latitude {
  readonly value: number;

  constructor(value: number) {
    Latitude.assertValid(value);
    this.value = value;
  }

  static assertValid(value: number): void {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < -90.0 ||
      value > 90.0
    ) {
      throw new InvalidArgumentException(
        '<Latitude> must be a finite number between -90 and 90'
      );
    }
  }

  equals(other: Latitude): boolean {
    return this.value === other.value;
  }

  toPrimitives(): number {
    return this.value;
  }
}
