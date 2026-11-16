import type { ProjectedPlant } from './types/ProjectedPlant.js';

export type ProjectPlantOptions = {
  plantInstanceId: string;
  plantId: string;
  bedId: string;
  scientificName: string;
  localCoordinates: { readonly x: number; readonly y: number };
  bedPosition: { readonly x: number; readonly y: number };
  bedRotation?: number;
  familyId?: string;
};

export class SpatialProjectionService {
  projectPoint(
    localPoint: { readonly x: number; readonly y: number },
    bedPosition: { readonly x: number; readonly y: number },
    bedRotation: number = 0
  ): { x: number; y: number } {
    const angleInRadians = (bedRotation * Math.PI) / 180;
    const cos = Math.cos(angleInRadians);
    const sin = Math.sin(angleInRadians);

    const rx = localPoint.x * cos - localPoint.y * sin;
    const ry = localPoint.x * sin + localPoint.y * cos;

    const gx = bedPosition.x + rx;
    const gy = bedPosition.y + ry;

    return {
      x: Math.round(gx * 100) / 100,
      y: Math.round(gy * 100) / 100
    };
  }

  projectPlant(options: ProjectPlantOptions): ProjectedPlant {
    const bedRotation = options.bedRotation ?? 0;
    const globalPosition = this.projectPoint(
      options.localCoordinates,
      options.bedPosition,
      bedRotation
    );

    return {
      plantInstanceId: options.plantInstanceId,
      plantId: options.plantId,
      bedId: options.bedId,
      scientificName: options.scientificName,
      ...(options.familyId !== undefined && { familyId: options.familyId }),
      globalPosition,
      localPosition: {
        x: options.localCoordinates.x,
        y: options.localCoordinates.y
      }
    };
  }
}
