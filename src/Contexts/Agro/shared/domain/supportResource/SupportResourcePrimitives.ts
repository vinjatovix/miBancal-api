import type { SupportResourceType } from './SupportResourceType.js';

/**
 * A piece of supporting material for a catalog entry (plant, anomaly, or a
 * future inputs/remedies catalog). Shared, single definition. An image is NOT
 * required at this level; the mandatory-image rule is plant-specific.
 */
export type SupportResourcePrimitives = {
  type: SupportResourceType;
  url: string;
  title?: string;
  source?: string;
  tags?: string[];
};
