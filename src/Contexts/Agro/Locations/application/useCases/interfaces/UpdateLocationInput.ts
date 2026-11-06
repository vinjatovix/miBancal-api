export type UpdateLocationInput = {
  id: string;
  userId: string;
  name?: string;
  latitude?: number | null;
  longitude?: number | null;
  canvasWidth?: number | null;
  canvasHeight?: number | null;
  width?: number | null;
  height?: number | null;
  northAngle?: number | null;
};
