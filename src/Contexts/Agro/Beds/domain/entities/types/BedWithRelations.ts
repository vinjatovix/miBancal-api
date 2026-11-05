import type { PlantInstance } from '../../../../PlantInstances/domain/entities/PlantInstance.js';
import type { Bed } from '../Bed.js';
import type { LocationSummary } from './LocationSummary.js';

export type BedWithRelations = {
  bed: Bed;
  cropIds: string[];
  crops?: PlantInstance[] | undefined;
  location?: LocationSummary | null | undefined;
};
