import type { Hemisphere } from './Hemisphere.js';

export type LocationChanges = {
  name?: string;
  postalCode?: string | null;
  country?: string | null;
  timezone?: string | null;
  hemisphere?: Hemisphere | null;
};
