import { Metadata } from '../../../shared/domain/valueObject/index.js';
import { createAnomalyId } from '../domain/AnomalyId.js';
import { Anomaly } from '../domain/entities/Anomaly.js';
import type { AnomalyGuidanceChanges } from '../domain/entities/types/AnomalyGuidanceChanges.js';
import { definedGuidance } from './guidanceFields.js';
import type { AnomalyInputMapper } from './interfaces/AnomalyInputMapper.js';

// Every mutable field of the change set; `null` (a clear) and any value are
// copied, `undefined` (an omitted field) is kept out.
const CHANGE_KEYS = [
  'name',
  'category',
  'scientificName',
  'description',
  'symptoms',
  'damage',
  'causes',
  'affectedCrops',
  'prevention',
  'treatment',
  'naturalEnemies',
  'resources',
  'confusedWith'
] as const satisfies ReadonlyArray<keyof AnomalyGuidanceChanges>;

export const anomalyInputMapper: AnomalyInputMapper = {
  fromCreateDto(dto, user) {
    return Anomaly.create({
      id: createAnomalyId(dto.id),
      slug: dto.slug,
      name: dto.name,
      category: dto.category,
      ...definedGuidance(dto),
      metadata: Metadata.create(user)
    });
  },

  toChanges(input): AnomalyGuidanceChanges {
    const changes: Record<string, unknown> = {};

    for (const key of CHANGE_KEYS) {
      const value = input[key];
      if (value !== undefined) changes[key] = value;
    }

    return changes;
  }
};
