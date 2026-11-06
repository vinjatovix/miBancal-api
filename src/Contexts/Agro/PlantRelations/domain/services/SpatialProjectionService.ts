import type { ProjectedPlant } from './types/ProjectedPlant.js';

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

  projectPlant(
    plantInstanceId: string,
    plantId: string,
    bedId: string,
    scientificName: string,
    localCoordinates: { readonly x: number; readonly y: number },
    bedPosition: { readonly x: number; readonly y: number },
    bedRotation: number = 0,
    familyId?: string
  ): ProjectedPlant {
    const globalPosition = this.projectPoint(
      localCoordinates,
      bedPosition,
      bedRotation
    );

    return {
      plantInstanceId,
      plantId,
      bedId,
      scientificName,
      ...(familyId !== undefined && { familyId }),
      globalPosition,
      localPosition: {
        x: localCoordinates.x,
        y: localCoordinates.y
      }
    };
  }
}
