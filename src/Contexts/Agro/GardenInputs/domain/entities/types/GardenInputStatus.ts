export type GardenInputStatus = 'active' | 'deleted';

export const GARDEN_INPUT_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted'
} as const;

export const GARDEN_INPUT_STATUSES = [
  'active',
  'deleted'
] as const satisfies ReadonlyArray<GardenInputStatus>;
