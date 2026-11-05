import { InvalidArgumentException } from '../../../../shared/domain/errors/index.js';

export class Longitude {
  readonly value: number;

  constructor(value: number) {
    this.ensureIsValid(value);
    this.value = value;
  }

  private ensureIsValid(value: number): void {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < -180.0 ||
      value > 180.0
    ) {
      throw new InvalidArgumentException(
        '<Longitude> must be a finite number between -180 and 180'
      );
    }
  }

  equals(other: Longitude): boolean {
    return this.value === other.value;
  }

  toPrimitives(): number {
    return this.value;
  }
}
