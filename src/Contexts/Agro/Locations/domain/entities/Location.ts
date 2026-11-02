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
import { isValidIanaTimezone } from '../utils/timezoneValidation.js';
import type { Hemisphere } from './types/Hemisphere.js';
import type { LocationChanges } from './types/LocationChanges.js';
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

const resolvePostalCode = (
  value: string | null | undefined,
  current?: string
): string | undefined => {
  if (value === undefined) return current;
  if (value === null) return undefined;

  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 20) {
    throw new InvalidArgumentException(
      '<Location.postalCode> must be between 1 and 20 characters'
    );
  }

  return trimmed;
};

const resolveCountry = (
  value: string | null | undefined,
  current?: string
): string | undefined => {
  if (value === undefined) return current;
  if (value === null) return undefined;

  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > 100) {
    throw new InvalidArgumentException(
      '<Location.country> must be between 1 and 100 characters'
    );
  }

  return trimmed;
};

const resolveTimezone = (
  value: string | null | undefined,
  current?: string
): string | undefined => {
  if (value === undefined) return current;
  if (value === null) return undefined;

  const trimmed = value.trim();
  if (!isValidIanaTimezone(trimmed)) {
    throw new InvalidArgumentException(
      '<Location.timezone> must be a canonical IANA identifier or UTC'
    );
  }

  return trimmed;
};

const resolveHemisphere = (
  value: Hemisphere | null | undefined,
  current?: Hemisphere
): Hemisphere | undefined => {
  if (value === undefined) return current;
  if (value === null) return undefined;

  if (value !== 'north' && value !== 'south') {
    throw new InvalidArgumentException(
      '<Location.hemisphere> must be either "north" or "south"'
    );
  }

  return value;
};

/**
 * A per-user growing site: a required `name`, unique (case/accent
 * insensitively) among the owner's active locations, plus optional
 * geographic context. Soft-deleted via `status`, mirroring
 * `GardenInput.assertSoftDeleteConsistency`.
 */
export class Location extends AggregateRoot<LocationId> {
  private props: Readonly<LocationState>;

  private constructor(props: LocationProps) {
    super(props.id);
    Location.assertSoftDeleteConsistency(props);

    const postalCode = resolvePostalCode(props.postalCode, undefined);
    const country = resolveCountry(props.country, undefined);
    const timezone = resolveTimezone(props.timezone, undefined);
    const hemisphere = resolveHemisphere(props.hemisphere, undefined);

    this.props = Object.freeze({
      ...props,
      name: resolveName(props.name),
      ...(postalCode !== undefined && { postalCode }),
      ...(country !== undefined && { country }),
      ...(timezone !== undefined && { timezone }),
      ...(hemisphere !== undefined && { hemisphere }),
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

  get postalCode(): string | undefined {
    return this.props.postalCode;
  }

  get country(): string | undefined {
    return this.props.country;
  }

  get timezone(): string | undefined {
    return this.props.timezone;
  }

  get hemisphere(): Hemisphere | undefined {
    return this.props.hemisphere;
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
    const nextName = resolveName(name);
    if (nextName === this.props.name) return;

    this.commit({ name: nextName }, actor, at);
  }

  /**
   * Applies partial geographic changes: a value sets, `null` unsets, an
   * omitted (`undefined`) field is left unchanged. A no-op leaves audit
   * metadata untouched.
   */
  updateGeography(changes: LocationChanges, actor: string, at: Date): void {
    const nextPostalCode = resolvePostalCode(
      changes.postalCode,
      this.props.postalCode
    );
    const nextCountry = resolveCountry(changes.country, this.props.country);
    const nextTimezone = resolveTimezone(changes.timezone, this.props.timezone);
    const nextHemisphere = resolveHemisphere(
      changes.hemisphere,
      this.props.hemisphere
    );

    if (
      nextPostalCode === this.props.postalCode &&
      nextCountry === this.props.country &&
      nextTimezone === this.props.timezone &&
      nextHemisphere === this.props.hemisphere
    ) {
      return;
    }

    const nextProps: LocationState = {
      ...this.props,
      metadata: Metadata.update(this.props.metadata, actor, at)
    };

    if (nextPostalCode !== undefined) nextProps.postalCode = nextPostalCode;
    else delete nextProps.postalCode;

    if (nextCountry !== undefined) nextProps.country = nextCountry;
    else delete nextProps.country;

    if (nextTimezone !== undefined) nextProps.timezone = nextTimezone;
    else delete nextProps.timezone;

    if (nextHemisphere !== undefined) nextProps.hemisphere = nextHemisphere;
    else delete nextProps.hemisphere;

    this.props = Object.freeze(nextProps);
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
