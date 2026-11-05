import {
  SUPPORT_RESOURCE_TYPES,
  type SupportResourceType
} from '../../../../shared/domain/supportResource/index.js';

/** Back-compat alias: a plant resource type is a shared support-resource type. */
export const PLANT_RESOURCE_TYPES = SUPPORT_RESOURCE_TYPES;

export type PlantResourceType = SupportResourceType;
