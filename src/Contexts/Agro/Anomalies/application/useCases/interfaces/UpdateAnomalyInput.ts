import type { UpdateAnomalyDto } from './UpdateAnomalyDto.js';

export type UpdateAnomalyInput = UpdateAnomalyDto & {
  /** The anomaly's id (UUID) or its current slug. */
  idOrSlug: string;
};
