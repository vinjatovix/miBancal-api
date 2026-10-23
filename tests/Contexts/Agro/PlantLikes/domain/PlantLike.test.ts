import { PlantLike } from '../../../../../src/Contexts/Agro/PlantLikes/domain/entities/PlantLike.js';
import {
  createPlantLikeId,
  randomPlantLikeId
} from '../../../../../src/Contexts/Agro/PlantLikes/domain/PlantLikeId.js';
import { createPlantId } from '../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';

describe('PlantLike', () => {
  const idStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c5';
  const userIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c1';
  const plantIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';

  const build = (at?: Date): PlantLike => {
    const id = createPlantLikeId(idStr);
    const userId = createUserId(userIdStr);
    const plantId = createPlantId(plantIdStr);

    return at === undefined
      ? PlantLike.create(id, userId, plantId)
      : PlantLike.create(id, userId, plantId, at);
  };

  it('stamps likedAt at creation time when none is given', () => {
    const before = Date.now();
    const like = build();
    const after = Date.now();

    const likedAtMs = like.likedAt.getTime();
    expect(likedAtMs).toBeGreaterThanOrEqual(before);
    expect(likedAtMs).toBeLessThanOrEqual(after);
  });

  it('keeps the given ids and an explicit timestamp', () => {
    const at = new Date('2026-10-23T14:30:00.000Z');
    const like = build(at);

    expect(like.id).toBe(idStr);
    expect(like.userId).toBe(userIdStr);
    expect(like.plantId).toBe(plantIdStr);
    expect(like.likedAt).toEqual(at);
  });

  it('serializes the public primitives with an ISO likedAt', () => {
    const at = new Date('2026-10-23T14:30:00.000Z');

    expect(build(at).toPrimitives()).toEqual({
      id: idStr,
      userId: userIdStr,
      plantId: plantIdStr,
      likedAt: at.toISOString()
    });
  });

  it('exposes only read accessors, so userId and plantId are immutable', () => {
    const like = build();
    const descriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(like),
      'userId'
    );

    expect(typeof descriptor?.set).toBe('undefined');
    expect(typeof descriptor?.get).toBe('function');
    expect(like.userId).toBe(userIdStr);
    expect(like.plantId).toBe(plantIdStr);
  });

  it('builds distinct ids with the random generator', () => {
    const first = randomPlantLikeId();
    const second = randomPlantLikeId();

    expect(first).not.toBe(second);
  });
});
