import { hasStateChanged } from '../../../../../shared/domain/diff/hasStateChanged.js';
import type { UnknownRecord } from '../../../../../shared/domain/types/UnknownRecord.js';
import { requiredText } from '../../../../../shared/domain/utils/requiredText.js';
import { uniqueTextList } from '../../../../../shared/domain/utils/uniqueTextList.js';
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
import {
  normaliseSupportResources,
  type SupportResourcePrimitives
} from '../../../shared/domain/supportResource/index.js';
import type { AnomalyId } from '../AnomalyId.js';
import {
  ANOMALY_CATEGORIES,
  type AnomalyCategory
} from './types/AnomalyCategory.js';
import type { AnomalyGuidanceChanges } from './types/AnomalyGuidanceChanges.js';
import type { AnomalyProps } from './types/AnomalyProps.js';
import { AnomalyStatus } from './types/AnomalyStatus.js';

type AnomalyState = AnomalyProps & { status: AnomalyStatus; version: number };

/** Optional single texts: absent or non-blank, never `""`. */
const SINGLE_TEXT_KEYS = ['scientificName', 'description'] as const;

/** Flat guidance lists; empty is stored as absent. */
const LIST_KEYS = [
  'symptoms',
  'damage',
  'causes',
  'affectedCrops',
  'prevention',
  'treatment',
  'naturalEnemies'
] as const satisfies ReadonlyArray<keyof AnomalyGuidanceChanges>;

type SingleTextKey = (typeof SINGLE_TEXT_KEYS)[number];
type ListKey = (typeof LIST_KEYS)[number];

/**
 * Every merge-patch key the aggregate owns: optional single texts, guidance
 * lists, and the two structured fields (`resources` is an object array, not a
 * text list; `confusedWith` is a slug list with its own dedup/self-strip rule).
 */
type NullableKey = SingleTextKey | ListKey | 'resources' | 'confusedWith';

/** `undefined` keeps the key, `null` removes it, any other value replaces it. */
function applyNullable<K extends NullableKey>(
  target: AnomalyProps,
  key: K,
  value: AnomalyProps[K] | null | undefined
): void {
  if (value === undefined) return;
  if (value === null) delete target[key];
  else target[key] = value;
}

/**
 * `confusedWith` normalisation: dedup case-insensitively keeping the first
 * occurrence (as `Plant.anomalies`), then silently drop the anomaly's own slug
 * (never raising). Existence of each remaining slug is checked in the
 * application layer, not here.
 */
const normaliseConfusedWith = (
  values: readonly unknown[],
  ownSlug: string
): string[] => {
  const unique = uniqueTextList(values, 'Anomaly.confusedWith');
  const own = ownSlug.trim().toLowerCase();

  return unique.filter((slug) => slug.toLowerCase() !== own);
};

const anomalyText = (value: unknown, field: string): string => {
  if (typeof value !== 'string') {
    throw new InvalidArgumentException(`Anomaly.${field} is required`);
  }
  return requiredText(value, `Anomaly.${field}`);
};

const anomalyTextList = (value: unknown, field: ListKey): string[] => {
  if (!Array.isArray(value)) {
    throw new InvalidArgumentException(`Anomaly.${field} must be an array`);
  }
  return uniqueTextList(value, `Anomaly.${field}`);
};

const anomalyCategory = (value: unknown): AnomalyCategory => {
  if (
    typeof value !== 'string' ||
    !ANOMALY_CATEGORIES.includes(value as AnomalyCategory)
  ) {
    throw new InvalidArgumentException(
      `Anomaly.category must be one of: ${ANOMALY_CATEGORIES.join(', ')}`
    );
  }
  return value as AnomalyCategory;
};

export class Anomaly extends AggregateRoot<AnomalyId> {
  private props: AnomalyState;

  private constructor(props: AnomalyProps) {
    super(props.id);
    this.props = Object.freeze({
      ...Anomaly.normalise(props),
      status: props.status ?? AnomalyStatus.ACTIVE,
      version: props.version ?? 0
    });
  }

  get idValue(): string {
    return this.id;
  }

  get slug(): string {
    return this.props.slug;
  }

  get name(): string {
    return this.props.name;
  }

  get scientificName(): string | undefined {
    return this.props.scientificName;
  }

  get category(): AnomalyCategory {
    return this.props.category;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get symptoms(): string[] | undefined {
    return this.props.symptoms;
  }

  get damage(): string[] | undefined {
    return this.props.damage;
  }

  get causes(): string[] | undefined {
    return this.props.causes;
  }

  get affectedCrops(): string[] | undefined {
    return this.props.affectedCrops;
  }

  get prevention(): string[] | undefined {
    return this.props.prevention;
  }

  get treatment(): string[] | undefined {
    return this.props.treatment;
  }

  get naturalEnemies(): string[] | undefined {
    return this.props.naturalEnemies;
  }

  get resources(): SupportResourcePrimitives[] | undefined {
    return this.props.resources;
  }

  get confusedWith(): string[] | undefined {
    return this.props.confusedWith;
  }

  get status(): AnomalyStatus {
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
    return this.props.status === AnomalyStatus.DELETED;
  }

  private assertActive(): void {
    if (this.isDeleted()) {
      throw new DomainConflictException('Cannot mutate a deleted anomaly');
    }
  }

  /**
   * Every built anomaly meets the catalog rules, whether created, loaded or
   * updated: required texts trimmed and never blank, optional texts absent or
   * non-blank, guidance lists without blanks or repeats (empty stored as
   * absent), category one of the closed set, and a `deletedAt` present exactly
   * when the status is `DELETED`.
   */
  private static normalise(props: AnomalyProps): AnomalyProps {
    if (!props.metadata) {
      throw new InvalidArgumentException('Anomaly.metadata is required');
    }

    Anomaly.assertSoftDeleteConsistency(props);

    return {
      id: props.id,
      slug: anomalyText(props.slug, 'slug'),
      name: anomalyText(props.name, 'name'),
      category: anomalyCategory(props.category),
      metadata: props.metadata,
      ...Anomaly.normaliseGuidance(props),
      ...(props.deletedAt !== undefined ? { deletedAt: props.deletedAt } : {})
    };
  }

  /** Trims optional texts and drops blank/duplicate list entries; empty lists are omitted. */
  private static normaliseGuidance(props: AnomalyProps): Partial<AnomalyProps> {
    const guidance: Partial<AnomalyProps> = {};

    for (const key of SINGLE_TEXT_KEYS) {
      const value = props[key];
      if (value !== undefined) guidance[key] = anomalyText(value, key);
    }

    for (const key of LIST_KEYS) {
      const value = props[key];
      if (value === undefined) continue;
      const list = anomalyTextList(value, key);
      if (list.length > 0) guidance[key] = list;
    }

    if (props.resources !== undefined) {
      const resources = normaliseSupportResources(
        props.resources,
        'Anomaly.resources'
      );
      if (resources.length > 0) guidance.resources = resources;
    }

    if (props.confusedWith !== undefined) {
      const confusedWith = normaliseConfusedWith(
        props.confusedWith,
        props.slug
      );
      if (confusedWith.length > 0) guidance.confusedWith = confusedWith;
    }

    return guidance;
  }

  /** A `deletedAt` is present exactly when the status is `DELETED`. */
  private static assertSoftDeleteConsistency(props: AnomalyProps): void {
    const status = props.status ?? AnomalyStatus.ACTIVE;

    if (status === AnomalyStatus.ACTIVE && props.deletedAt) {
      throw new InvalidArgumentException(
        'Active anomaly cannot have deletedAt'
      );
    }
    if (status === AnomalyStatus.DELETED && !props.deletedAt) {
      throw new InvalidArgumentException('Deleted anomaly must have deletedAt');
    }
  }

  syncVersion(outcome: WriteOutcome): void {
    this.props = Object.freeze({
      ...this.props,
      version: versionAfter(this.props.version, outcome)
    });
  }

  updateGuidance(
    changes: AnomalyGuidanceChanges,
    user: string,
    at: Date = new Date()
  ): void {
    this.assertActive();

    const draft: AnomalyProps = { ...this.props };

    // `slug` is immutable; `name`/`category` replace but never clear.
    if (changes.name !== undefined) draft.name = changes.name;
    if (changes.category !== undefined) draft.category = changes.category;

    for (const key of SINGLE_TEXT_KEYS) applyNullable(draft, key, changes[key]);
    for (const key of LIST_KEYS) applyNullable(draft, key, changes[key]);
    applyNullable(draft, 'resources', changes.resources);
    applyNullable(draft, 'confusedWith', changes.confusedWith);

    const candidate = Anomaly.normalise(draft);

    if (
      !hasStateChanged(
        Anomaly.snapshot(this.props),
        Anomaly.snapshot(candidate)
      )
    )
      return;

    this.props = Object.freeze({
      ...candidate,
      status: this.props.status,
      ...(this.props.deletedAt ? { deletedAt: this.props.deletedAt } : {}),
      version: this.props.version,
      metadata: Metadata.update(this.props.metadata, user, at)
    });
  }

  markAsDeleted(user: string, at: Date = new Date()): void {
    if (this.isDeleted()) return;

    this.props = Object.freeze({
      ...this.props,
      status: AnomalyStatus.DELETED,
      deletedAt: at,
      metadata: Metadata.update(this.props.metadata, user, at)
    });
  }

  /** Guidance fields only: audit data, version and soft-delete state are not a change. */
  private static snapshot(props: AnomalyProps): UnknownRecord {
    const {
      metadata: _metadata,
      version: _version,
      status: _status,
      deletedAt: _deletedAt,
      ...guidance
    } = props;

    return guidance;
  }

  static create(props: AnomalyProps): Anomaly {
    return new Anomaly(props);
  }
}
