import { DomainConflictException } from '../../../../shared/domain/errors/index.js';

export type ProposedPlacement = {
  position: { x: number; y: number };
  vitalRadiusCm: number;
};

export type ExistingCropSpatial = {
  id: string;
  position?: { x: number; y: number } | undefined;
  vitalRadiusCm: number;
};

export type ValidatePlacementParams = {
  bed: { width: number; height: number };
  proposed: ProposedPlacement;
  existingCrops: ExistingCropSpatial[];
  excludeCropId?: string | undefined;
};

export type BatchSpatialItem = {
  itemIndex: number;
  id?: string | undefined;
  position?: { x: number; y: number } | undefined;
  vitalRadiusCm: number;
};

export type ValidateBatchPlacementParams = {
  bed: { width: number; height: number };
  items: BatchSpatialItem[];
  existingCrops: ExistingCropSpatial[];
};

export type ValidateBatchMovementParams = {
  bed: { width: number; height: number };
  items: BatchSpatialItem[];
  existingCrops: ExistingCropSpatial[];
  excludeCropIds?: Set<string> | string[] | undefined;
};

export class CropSpatialService {
  validatePlacement({
    bed,
    proposed,
    existingCrops,
    excludeCropId
  }: ValidatePlacementParams): void {
    this.assertWithinBounds(bed, proposed.position);

    for (const crop of existingCrops) {
      this.assertNoOverlap(proposed, crop, excludeCropId);
    }
  }

  validateBatchPlacement({
    bed,
    items,
    existingCrops
  }: ValidateBatchPlacementParams): void {
    this.validateBatchMovement({
      bed,
      items,
      existingCrops
    });
  }

  validateBatchMovement({
    bed,
    items,
    existingCrops,
    excludeCropIds
  }: ValidateBatchMovementParams): void {
    const placedItems = items.filter(
      (
        item
      ): item is BatchSpatialItem & { position: { x: number; y: number } } =>
        item.position !== undefined
    );

    for (const item of placedItems) {
      this.assertBatchItemWithinBounds(bed, item);
    }

    for (let i = 0; i < placedItems.length; i++) {
      for (let j = i + 1; j < placedItems.length; j++) {
        this.assertNoInternalBatchOverlap(placedItems[i]!, placedItems[j]!);
      }
    }

    const excludedSet =
      excludeCropIds instanceof Set
        ? excludeCropIds
        : new Set(excludeCropIds ?? []);

    for (const item of placedItems) {
      for (const crop of existingCrops) {
        if (excludedSet.has(crop.id)) {
          continue;
        }
        this.assertNoBatchItemWithExistingOverlap(item, crop);
      }
    }
  }

  private assertBatchItemWithinBounds(
    bed: { width: number; height: number },
    item: BatchSpatialItem & { position: { x: number; y: number } }
  ): void {
    const { x, y } = item.position;

    if (x < 0 || x > bed.width || y < 0 || y > bed.height) {
      throw new DomainConflictException(
        'Crop position is outside bed boundaries',
        {
          conflictType: 'bounds',
          itemIndex: String(item.itemIndex),
          coordinates: `(${x}, ${y})`,
          bedBounds: `${bed.width}x${bed.height}`,
          ...(item.id ? { cropId: item.id } : {})
        }
      );
    }
  }

  private assertNoInternalBatchOverlap(
    first: BatchSpatialItem & { position: { x: number; y: number } },
    second: BatchSpatialItem & { position: { x: number; y: number } }
  ): void {
    if (first.vitalRadiusCm <= 0 || second.vitalRadiusCm <= 0) {
      return;
    }

    const dx = first.position.x - second.position.x;
    const dy = first.position.y - second.position.y;
    const distance = Math.hypot(dx, dy);
    const minRequired = first.vitalRadiusCm + second.vitalRadiusCm;

    if (distance < minRequired) {
      throw new DomainConflictException(
        'Spatial collision detected within batch',
        {
          conflictType: 'internal',
          itemIndex: String(first.itemIndex),
          collidingWithIndex: String(second.itemIndex),
          distance: `${distance.toFixed(2)}cm`,
          minRequired: `${minRequired.toFixed(2)}cm`,
          ...(first.id ? { cropId: first.id } : {})
        }
      );
    }
  }

  private assertNoBatchItemWithExistingOverlap(
    item: BatchSpatialItem & { position: { x: number; y: number } },
    crop: ExistingCropSpatial
  ): void {
    if (!crop.position || crop.vitalRadiusCm <= 0 || item.vitalRadiusCm <= 0) {
      return;
    }

    const dx = item.position.x - crop.position.x;
    const dy = item.position.y - crop.position.y;
    const distance = Math.hypot(dx, dy);
    const minRequired = item.vitalRadiusCm + crop.vitalRadiusCm;

    if (distance < minRequired) {
      throw new DomainConflictException(
        'Spatial collision detected with existing crop',
        {
          conflictType: 'existing',
          itemIndex: String(item.itemIndex),
          collidingWithCropId: crop.id,
          distance: `${distance.toFixed(2)}cm`,
          minRequired: `${minRequired.toFixed(2)}cm`,
          ...(item.id ? { cropId: item.id } : {})
        }
      );
    }
  }

  private assertWithinBounds(
    bed: { width: number; height: number },
    position: { x: number; y: number }
  ): void {
    const { x, y } = position;

    if (x < 0 || x > bed.width || y < 0 || y > bed.height) {
      throw new DomainConflictException(
        `Crop position (${x}, ${y}) is outside bed boundaries (${bed.width}x${bed.height})`
      );
    }
  }

  private assertNoOverlap(
    proposed: ProposedPlacement,
    crop: ExistingCropSpatial,
    excludeCropId: string | undefined
  ): void {
    if (excludeCropId && crop.id === excludeCropId) {
      return;
    }

    if (!crop.position) {
      return;
    }

    // A crop with no vital space (radius 0, e.g. its plant is missing from
    // the catalog) occupies no area and never triggers a collision.
    if (proposed.vitalRadiusCm <= 0 || crop.vitalRadiusCm <= 0) {
      return;
    }

    const { x, y } = proposed.position;
    const dx = x - crop.position.x;
    const dy = y - crop.position.y;
    const distance = Math.hypot(dx, dy);
    // Vital circles overlap only when the centers are closer than the sum of
    // the two radii. Touching at exactly that distance does not collide.
    const minRequired = proposed.vitalRadiusCm + crop.vitalRadiusCm;

    if (distance < minRequired) {
      throw new DomainConflictException(
        `Crop at (${x}, ${y}) collides with existing crop at (${crop.position.x}, ${crop.position.y}): distance ${distance.toFixed(2)}cm is less than the required ${minRequired}cm (sum of vital radii)`
      );
    }
  }
}
