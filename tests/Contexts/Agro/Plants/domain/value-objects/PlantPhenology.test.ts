import { PlantPhenology } from '../../../../../../src/Contexts/Agro/Plants/domain/value-objects/PlantPhenology.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { PlantPhenologyBuilder } from '../mothers/PlantPhenologyBuilder.js';

describe('PlantPhenology (value object)', () => {
  it('should round-trip through its primitives', () => {
    const primitives = PlantPhenologyBuilder.full().toPrimitives();

    const restored = PlantPhenology.fromPrimitives(primitives).toPrimitives();

    expect(restored).toEqual(primitives);
  });

  it('should omit the sowing key when the plant has no seed cycle', () => {
    const primitives = PlantPhenologyBuilder.seedless().toPrimitives();

    expect(primitives).not.toHaveProperty('sowing');
    expect(primitives.flowering).toBeDefined();
    expect(primitives.harvest).toBeDefined();
  });

  it('should round-trip a sowing-free phenology without inventing sowing', () => {
    const primitives = PlantPhenologyBuilder.seedless().toPrimitives();

    const restored = PlantPhenology.fromPrimitives(primitives);

    expect(restored.sowing).toBeUndefined();
    expect(restored.toPrimitives()).toEqual(primitives);
  });

  it('should keep a present sowing block when round-tripping', () => {
    const phenology = PlantPhenologyBuilder.tomato();

    const restored = PlantPhenology.fromPrimitives(phenology.toPrimitives());

    expect(restored.sowing).toBeDefined();
    expect(restored.toPrimitives()).toEqual(phenology.toPrimitives());
  });

  it('should clear the sowing block when changes send null', () => {
    const phenology = PlantPhenologyBuilder.tomato();

    const updated = phenology.update({ sowing: null });

    expect(updated.sowing).toBeUndefined();
    expect(updated.toPrimitives()).not.toHaveProperty('sowing');
  });

  it('should merge a partial sowing change when sowing exists', () => {
    const phenology = PlantPhenologyBuilder.tomato();

    const updated = phenology.update({ sowing: { seedsPerHole: { max: 9 } } });

    expect(updated.sowing?.seedsPerHole.max).toBe(9);
    expect(updated.sowing?.seedsPerHole.min).toBe(
      phenology.sowing?.seedsPerHole.min
    );
  });

  it('should build a complete sowing when adding it to a sowing-free plant', () => {
    const phenology = PlantPhenologyBuilder.seedless();

    const updated = phenology.update({
      sowing: {
        months: [3],
        seedsPerHole: { min: 1, max: 2 },
        germinationDays: { min: 5, max: 10 },
        methods: { direct: { depthCm: { min: 1, max: 2 } } }
      }
    });

    expect(updated.sowing).toBeDefined();
    expect(updated.sowing?.months.toArray()).toEqual([3]);
  });

  it('should reject an incomplete sowing when the plant has none', () => {
    const phenology = PlantPhenologyBuilder.seedless();

    expect(() => phenology.update({ sowing: { months: [3] } })).toThrow(
      InvalidArgumentException
    );
  });

  it('should keep sowing untouched when the change set omits it', () => {
    const phenology = PlantPhenologyBuilder.tomato();

    const updated = phenology.update({ harvest: { months: [10] } });

    expect(updated.sowing).toBe(phenology.sowing);
  });

  it('should keep the sections the changes do not touch', () => {
    const phenology = PlantPhenologyBuilder.tomato();

    const updated = phenology.update({ harvest: { months: [10] } });

    expect(updated.sowing).toBe(phenology.sowing);
    expect(updated.flowering).toBe(phenology.flowering);
    expect(updated.harvest.months.toArray()).toEqual([10]);
  });

  it('should not modify itself', () => {
    const phenology = PlantPhenologyBuilder.tomato();
    const before = phenology.toPrimitives();

    phenology.update({ flowering: { months: [1] } });

    expect(phenology.toPrimitives()).toEqual(before);
  });
});
