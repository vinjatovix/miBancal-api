import { InvalidArgumentException } from '../../../../shared/domain/errors/InvalidArgumentException.js';
import type { ProximityDistancePrimitives } from './types/ProximityDistancePrimitives.js';

export class ProximityDistance {
  readonly minDistanceCm: number;
  readonly maxDistanceCm: number | null;

  constructor(minDistanceCm: number, maxDistanceCm: number | null = null) {
    this.ensureValidMinDistance(minDistanceCm);
    this.ensureValidMaxDistance(minDistanceCm, maxDistanceCm);

    this.minDistanceCm = minDistanceCm;
    this.maxDistanceCm = maxDistanceCm;
  }

  static create(
    minDistanceCm: number,
    maxDistanceCm: number | null = null
  ): ProximityDistance {
    return new ProximityDistance(minDistanceCm, maxDistanceCm);
  }

  static fromPrimitives(
    primitives: ProximityDistancePrimitives
  ): ProximityDistance {
    return new ProximityDistance(
      primitives.minDistanceCm,
      primitives.maxDistanceCm
    );
  }

  toPrimitives(): ProximityDistancePrimitives {
    return {
      minDistanceCm: this.minDistanceCm,
      maxDistanceCm: this.maxDistanceCm
    };
  }

  isUnbounded(): boolean {
    return this.maxDistanceCm === null;
  }

  isWithinRange(distanceCm: number): boolean {
    if (
      typeof distanceCm !== 'number' ||
      Number.isNaN(distanceCm) ||
      distanceCm < 0
    ) {
      return false;
    }

    if (distanceCm < this.minDistanceCm) {
      return false;
    }

    if (this.maxDistanceCm === null) {
      return true;
    }

    return distanceCm <= this.maxDistanceCm;
  }

  private ensureValidMinDistance(minDistanceCm: number): void {
    if (!Number.isInteger(minDistanceCm) || minDistanceCm < 0) {
      throw new InvalidArgumentException(
        `<ProximityDistance> minDistanceCm must be a non-negative integer: ${minDistanceCm}`
      );
    }
  }

  private ensureValidMaxDistance(
    minDistanceCm: number,
    maxDistanceCm: number | null
  ): void {
    if (maxDistanceCm === null) {
      return;
    }

    if (!Number.isInteger(maxDistanceCm) || maxDistanceCm < minDistanceCm) {
      throw new InvalidArgumentException(
        `<ProximityDistance> maxDistanceCm must be an integer greater than or equal to minDistanceCm (${minDistanceCm}): ${maxDistanceCm}`
      );
    }
  }
}
