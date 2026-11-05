export type UpdateLocationInput = {
  id: string;
  userId: string;
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
};
