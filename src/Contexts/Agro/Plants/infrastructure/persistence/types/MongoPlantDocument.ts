import type { Binary, UUID } from 'mongodb';
import type { RangePrimitives } from '../../../../../../shared/domain/value-objects/interfaces/RangePrimitives.js';
import type { IdentityPrimitives } from '../../../domain/entities/types/IdentityPrimitives.js';
import type { PlantEcologicalTraits } from '../../../domain/entities/types/PlantEcologicalTraits.js';
import type { PlantKnowledgePrimitives } from '../../../domain/entities/types/PlantKnowledgePrimitives.js';
import type { PlantLifecycleValue } from '../../../domain/entities/types/PlantLifecycleValue.js';
import type { PlantPrimitives } from '../../../domain/entities/types/PlantPrimitives.js';

export type MongoPlantDocument = {
  _id: string | Binary | UUID;
  identity: IdentityPrimitives;

  traits: {
    lifecycle: PlantLifecycleValue;
    size: {
      height: RangePrimitives;
      spread: RangePrimitives;
    };
    spacingCm: RangePrimitives;
    ecological?: PlantEcologicalTraits;
  };

  phenology: PlantPrimitives['phenology'];

  knowledge?: PlantKnowledgePrimitives;

  anomalies?: string[];

  metadata: PlantPrimitives['metadata'];
  status: PlantPrimitives['status'];
  deletedAt?: string | null;
  version: number;
  /**
   * Read-only likes projection. Absent on documents created before this
   * feature; read as `0`. Never written by the plant write path.
   */
  likesCount?: number;
};
