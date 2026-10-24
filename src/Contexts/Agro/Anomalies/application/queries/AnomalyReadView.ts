import type { MetadataPrimitives } from '../../../../shared/domain/MetadataPrimitives.js';
import type {
  AnomalyCategory,
  AnomalyStatus
} from '../../domain/entities/types/index.js';

/**
 * An anomaly as the catalog read path returns it: plain stored data shaped like
 * the public `Anomaly` response. Never an `Anomaly` aggregate, so no business
 * rule is checked when it is built.
 */
export type AnomalyReadView = {
  readonly id: string;
  readonly version: number;
  readonly slug: string;
  readonly name: string;
  /** Omitted when the anomaly has no scientific name. */
  readonly scientificName?: string;
  readonly category: AnomalyCategory;
  /** Omitted when the anomaly has no description. */
  readonly description?: string;
  readonly symptoms?: string[];
  readonly damage?: string[];
  readonly causes?: string[];
  readonly affectedCrops?: string[];
  readonly prevention?: string[];
  readonly treatment?: string[];
  readonly naturalEnemies?: string[];
  /** `ACTIVE` or `DELETED`. */
  readonly status: `${AnomalyStatus}`;
  /** Present only while `DELETED`; omitted for an active anomaly. */
  readonly deletedAt?: string;
  readonly metadata: MetadataPrimitives;
};

/** Fields of an anomaly that `fields[anomalies]` can select; declared order is canonical. */
export const ANOMALY_FIELDS = [
  'id',
  'slug',
  'name',
  'scientificName',
  'category',
  'description',
  'symptoms',
  'damage',
  'causes',
  'affectedCrops',
  'prevention',
  'treatment',
  'naturalEnemies',
  'status',
  'deletedAt',
  'metadata',
  'version'
] as const satisfies readonly (keyof AnomalyReadView)[];

export type AnomalyField = (typeof ANOMALY_FIELDS)[number];

/** What a read with a fieldset returns: `id` plus any subset of the fields. */
export type AnomalySparseView = Pick<AnomalyReadView, 'id'> &
  Partial<Omit<AnomalyReadView, 'id'>>;
