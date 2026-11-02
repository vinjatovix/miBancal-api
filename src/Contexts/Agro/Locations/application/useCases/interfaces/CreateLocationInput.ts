import type { Hemisphere } from '../../../domain/entities/types/Hemisphere.js';

export type CreateLocationInput = {
  id: string;
  userId: string;
  name: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  hemisphere?: Hemisphere;
};
