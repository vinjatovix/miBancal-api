import type { UserId } from '../../../../Auth/domain/UserId.js';
import { AggregateRoot } from '../../../../shared/domain/entities/AggregateRoot.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../shared/domain/errors/index.js';
import {
  type WriteOutcome,
  versionAfter
} from '../../../../shared/domain/repositories/WriteOutcome.js';
import { Metadata } from '../../../../shared/domain/valueObject/Metadata.js';
import type { LocationId } from '../LocationId.js';
import { Latitude } from '../value-objects/Latitude.js';
import { Longitude } from '../value-objects/Longitude.js';
import type { LocationProps } from './types/LocationProps.js';
import type { LocationStatus } from './types/LocationStatus.js';

type LocationState = LocationProps & {
  status: LocationStatus;
  version: number;
};

const resolveName = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new InvalidArgumentException(
      '<Location.name> must be between 1 and 100 characters'
    );
  }
  return trimmed;
};

/**
 * A per-user growing site: a required `name`, unique (case/accent
 * insensitively) among the owner's active locations, plus optional
 * geographic coordinates (latitude and longitude). Soft-deleted via `status`.
 */
export class Location extends AggregateRoot<LocationId> {
  private props: Readonly<LocationState>;

  private constructor(props: LocationProps) {
    super(props.id);
    Location.assertSoftDeleteConsistency(props);

    if (props.latitude !== undefined || props.longitude !== undefined) {
      if (props.latitude === undefined || props.longitude === undefined) {
        throw new InvalidArgumentException(
          '<Location> latitude and longitude must both be provided together'
        );
      }
      new Latitude(props.latitude);
      new Longitude(props.longitude);
    }

    this.props = Object.freeze({
      ...props,
      name: resolveName(props.name),
      latitude: props.latitude,
      longitude: props.longitude,
      status: props.status ?? 'active',
      version: props.version ?? 0
    });
  }

  get userId(): UserId {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get latitude(): number | undefined {
    return this.props.latitude;
  }

  get longitude(): number | undefined {
    return this.props.longitude;
  }

  get status(): LocationStatus {
    return this.props.status;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  get metadata(): Metadata {
    return this.props.metadata;
  }

  get version(): number {
    return this.props.version;
  }

  isDeleted(): boolean {
    return this.props.status === 'deleted';
  }

  static create(props: LocationProps): Location {
    return new Location(props);
  }

  rename(name: string, actor: string, at: Date): void {
    this.assertActive();

    const nextName = resolveName(name);
    if (nextName === this.props.name) return;

    this.commit({ name: nextName }, actor, at);
  }

  /**
   * Updates geographic coordinates atomically. Coordinates must be valid
   * numbers within range or both null to clear. A no-op leaves audit metadata untouched.
   */
  updateCoordinates(
    coords: { latitude: number | null; longitude: number | null },
    actor: string,
    at: Date
  ): void {
    this.assertActive();

    if (coords.latitude === null && coords.longitude === null) {
      if (
        this.props.latitude === undefined &&
        this.props.longitude === undefined
      ) {
        return;
      }

      this.commit(
        {
          latitude: undefined,
          longitude: undefined
        },
        actor,
        at
      );
      return;
    }

    if (coords.latitude === null || coords.longitude === null) {
      throw new InvalidArgumentException(
        '<Location> latitude and longitude must both be provided together'
      );
    }

    new Latitude(coords.latitude);
    new Longitude(coords.longitude);

    if (
      this.props.latitude === coords.latitude &&
      this.props.longitude === coords.longitude
    ) {
      return;
    }

    this.commit(
      {
        latitude: coords.latitude,
        longitude: coords.longitude
      },
      actor,
      at
    );
  }

  markAsDeleted(actor: string, at: Date): void {
    if (this.isDeleted()) {
      throw new DomainConflictException('Location is already deleted');
    }

    this.commit({ status: 'deleted', deletedAt: at }, actor, at);
  }

  syncVersion(outcome: WriteOutcome): void {
    this.props = Object.freeze({
      ...this.props,
      version: versionAfter(this.props.version, outcome)
    });
  }

  private assertActive(): void {
    if (this.isDeleted()) {
      throw new DomainConflictException('Cannot mutate a deleted location');
    }
  }

  private commit(
    changes: Partial<LocationState>,
    actor: string,
    at: Date
  ): void {
    this.props = Object.freeze({
      ...this.props,
      ...changes,
      metadata: Metadata.update(this.props.metadata, actor, at)
    });
  }

  private static assertSoftDeleteConsistency(props: LocationProps): void {
    const status = props.status ?? 'active';

    if (status === 'active' && props.deletedAt) {
      throw new InvalidArgumentException(
        'Active location cannot have deletedAt'
      );
    }
    if (status === 'deleted' && !props.deletedAt) {
      throw new InvalidArgumentException(
        'Deleted location must have deletedAt'
      );
    }
  }
}
