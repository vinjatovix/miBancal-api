import type { Anomaly } from '../../domain/entities/Anomaly.js';
import type { AnomalyPrimitives } from '../../domain/entities/types/AnomalyPrimitives.js';

export interface AnomalyDomainMapper {
  toPrimitives(anomaly: Anomaly): AnomalyPrimitives;
  fromPrimitives(primitives: AnomalyPrimitives): Anomaly;
}
