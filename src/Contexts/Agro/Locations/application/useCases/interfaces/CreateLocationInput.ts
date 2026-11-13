export type CreateLocationInput = {
  id: string;
  userId: string;
  name: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  northAngle?: number | undefined;
};
