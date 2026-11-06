export type CreateLocationInput = {
  id: string;
  userId: string;
  name: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  canvasWidth?: number | undefined;
  canvasHeight?: number | undefined;
  northAngle?: number | undefined;
};
