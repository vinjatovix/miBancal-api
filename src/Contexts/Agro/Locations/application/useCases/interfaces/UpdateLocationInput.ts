import type { Hemisphere } from '../../../domain/entities/types/Hemisphere.js';

export type UpdateLocationInput = {
  id: string;
  userId: string;
  name?: string;
  postalCode?: string | null;
  country?: string | null;
  timezone?: string | null;
  hemisphere?: Hemisphere | null;
};
