import type { PlantPhenologyChanges } from '../entities/types/PlantPhenologyChanges.js';
import type { PlantPrimitives } from '../entities/types/PlantPrimitives.js';
import { PlantFlowering } from './PlantFlowering.js';
import { PlantHarvest } from './PlantHarvest.js';
import { PlantSowing } from './PlantSowing.js';

export type PlantPhenologyPrimitives = PlantPrimitives['phenology'];

export type PlantPhenologyProps = {
  sowing?: PlantSowing;
  flowering: PlantFlowering;
  harvest: PlantHarvest;
};

/**
 * A plant's yearly cycle. `sowing` is optional: plants that propagate
 * vegetatively or have no viable seeds carry no seed cycle. `flowering` and
 * `harvest` are always present, with no months for plants that never flower or
 * are not harvested.
 */
export class PlantPhenology {
  readonly sowing?: PlantSowing;
  readonly flowering: PlantFlowering;
  readonly harvest: PlantHarvest;

  constructor(props: PlantPhenologyProps) {
    if (props.sowing !== undefined) this.sowing = props.sowing;
    this.flowering = props.flowering;
    this.harvest = props.harvest;
  }

  update(changes: PlantPhenologyChanges): PlantPhenology {
    return new PlantPhenology({
      ...this.sowingProp(this.nextSowing(changes)),
      flowering: changes.flowering
        ? this.flowering.update(changes.flowering)
        : this.flowering,
      harvest: changes.harvest
        ? this.harvest.update(changes.harvest)
        : this.harvest
    });
  }

  /**
   * Resolves the next sowing from PATCH changes:
   * - absent (`undefined`) → keep the current value;
   * - `null` → clear (resulting in no sowing);
   * - object + current present → partial merge;
   * - object + current absent → build a new complete block (incomplete throws).
   */
  private nextSowing(changes: PlantPhenologyChanges): PlantSowing | undefined {
    if (changes.sowing === undefined) return this.sowing;
    if (changes.sowing === null) return undefined;
    return this.sowing
      ? this.sowing.update(changes.sowing)
      : PlantSowing.fromChanges(changes.sowing);
  }

  private sowingProp(
    sowing: PlantSowing | undefined
  ): Pick<PlantPhenologyProps, 'sowing'> {
    return sowing !== undefined ? { sowing } : {};
  }

  toPrimitives(): PlantPhenologyPrimitives {
    return {
      ...(this.sowing !== undefined && { sowing: this.sowing.toPrimitives() }),
      flowering: this.flowering.toPrimitives(),
      harvest: this.harvest.toPrimitives()
    };
  }

  static fromPrimitives(primitives: PlantPhenologyPrimitives): PlantPhenology {
    return new PlantPhenology({
      ...(primitives.sowing !== undefined && {
        sowing: PlantSowing.fromPrimitives(primitives.sowing)
      }),
      flowering: PlantFlowering.fromPrimitives(primitives.flowering),
      harvest: PlantHarvest.fromPrimitives(primitives.harvest)
    });
  }
}
