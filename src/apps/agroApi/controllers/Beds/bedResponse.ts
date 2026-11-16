import type { BedPrimitives } from '../../../../Contexts/Agro/Beds/domain/entities/types/BedPrimitives.js';
import type { BedWithRelations } from '../../../../Contexts/Agro/Beds/domain/entities/types/BedWithRelations.js';
import type { LocationSummary } from '../../../../Contexts/Agro/Beds/domain/entities/types/LocationSummary.js';
import { bedDomainMapper } from '../../../../Contexts/Agro/Beds/mappers/bedDomainMapper.js';
import type { PlantInstancePrimitives } from '../../../../Contexts/Agro/PlantInstances/domain/entities/types/PlantInstancePrimitives.js';
import { plantInstanceDomainMapper } from '../../../../Contexts/Agro/PlantInstances/mappers/plantInstanceDomainMapper.js';

export type BedResponse = BedPrimitives & {
  plantInstances: string[] | PlantInstancePrimitives[];
  location?: LocationSummary | null | undefined;
};

/** Crops are listed by id unless they were loaded in full to be embedded. */
export const toBedResponse = ({
  bed,
  cropIds,
  crops,
  location
}: BedWithRelations): BedResponse => ({
  ...bedDomainMapper.toPrimitives(bed),
  plantInstances: crops
    ? crops.map((crop) => plantInstanceDomainMapper.toPrimitives(crop))
    : cropIds,
  ...(location !== undefined && { location })
});
