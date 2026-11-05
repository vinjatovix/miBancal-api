import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';
import type { PlantLightPrimitives } from './PlantLightPrimitives.js';
import type { PlantPropagationPrimitives } from './PlantPropagationPrimitives.js';
import type { PruningTypePrimitives } from './PruningPrimitves.js';
import type { RootSystemPrimitives } from './RootSystemPrimitives.js';
import type { WateringFrequency } from './WateringFrequency.js';

export type PlantKnowledgePrimitives = {
  soil?: {
    ph: RangePrimitives;
    availableDepthCm: RangePrimitives;
  };
  rootSystem?: RootSystemPrimitives;
  watering?: {
    frequency: WateringFrequency;
    conditions?: string[];
  };
  light?: PlantLightPrimitives;
  pruning?: Array<PruningTypePrimitives>;
  propagation?: PlantPropagationPrimitives;
  ecology?: {
    strategicBenefits?: string[];
  };
  resources?: Array<SupportResourcePrimitives>;
  notes?: string[];
};

/**
 * Back-compat alias: a `knowledge.resources` entry is a shared support resource
 * (rich media or an article attachment). The plant-specific mandatory-image
 * rule stays in `Plant.requireImage`, not in this shared shape.
 */
export type PlantResourcePrimitives = SupportResourcePrimitives;
