import { LikePlant } from '../../../../../../src/Contexts/Agro/PlantLikes/application/useCases/LikePlant.js';
import { PlantLiked } from '../../../../../../src/Contexts/Agro/PlantLikes/domain/events/index.js';
import type { PlantLikeRepository } from '../../../../../../src/Contexts/Agro/PlantLikes/domain/repositories/interfaces/PlantLikeRepository.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/interfaces/index.js';
import type { EventBus } from '../../../../../../src/Contexts/shared/application/eventBus/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import type { DomainEvent } from '../../../../../../src/Contexts/shared/domain/events/index.js';
import { UnitOfWorkMock } from '../../../../shared/__mocks__/UnitOfWorkMock.js';
import { PlantLikeMother } from '../../domain/PlantLikeMother.js';

describe('LikePlant', () => {
  const plantIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const activePlant = { id: createPlantId(plantIdStr) } as unknown as Plant;

  const buildMocks = () => {
    const findActiveById = jest.fn();
    const plantRepository = { findActiveById } as unknown as PlantRepository;

    const add = jest.fn();
    const remove = jest.fn();
    const find = jest.fn();
    const plantLikeRepository = {
      add,
      remove,
      find
    } as unknown as PlantLikeRepository;

    const publish = jest
      .fn<Promise<void>, [DomainEvent[]]>()
      .mockResolvedValue();
    const eventBus = { publish, subscribe: jest.fn() } as unknown as EventBus;

    const unitOfWork = new UnitOfWorkMock();

    return {
      findActiveById,
      add,
      remove,
      find,
      publish,
      plantRepository,
      plantLikeRepository,
      eventBus,
      unitOfWork
    };
  };

  const buildUseCase = (mocks: ReturnType<typeof buildMocks>): LikePlant =>
    new LikePlant({
      plantRepository: mocks.plantRepository,
      plantLikeRepository: mocks.plantLikeRepository,
      eventBus: mocks.eventBus,
      unitOfWork: mocks.unitOfWork
    });

  it('announces a plant.liked fact on a first like (201)', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(activePlant);
    mocks.add.mockResolvedValueOnce(true);

    const result = await buildUseCase(mocks).execute(
      { plantId: plantIdStr },
      user
    );

    expect(result.status).toBe(201);
    expect(result.item.plantId).toBe(plantIdStr);
    expect(typeof result.item.likedAt).toBe('string');
    expect(mocks.publish).toHaveBeenCalledTimes(1);

    const [firstCall] = mocks.publish.mock.calls;
    const published = firstCall?.[0] ?? [];
    expect(published).toHaveLength(1);

    const [event] = published;
    expect(event).toBeInstanceOf(PlantLiked);
    expect(event?.payload).toEqual({
      plantId: plantIdStr,
      userId: user.id,
      likedAt: result.item.likedAt
    });
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.unitOfWork.runCount).toBe(1);
  });

  it('announces nothing on a repeat like and returns the existing likedAt (200)', async () => {
    const mocks = buildMocks();
    const likedAt = new Date('2026-10-23T14:30:00.000Z');
    mocks.findActiveById.mockResolvedValueOnce(activePlant);
    mocks.add.mockResolvedValueOnce(false);
    mocks.find.mockResolvedValueOnce(
      PlantLikeMother.of(user.id, plantIdStr, likedAt)
    );

    const result = await buildUseCase(mocks).execute(
      { plantId: plantIdStr },
      user
    );

    expect(result.status).toBe(200);
    expect(result.item.plantId).toBe(plantIdStr);
    expect(result.item.likedAt).toBe(likedAt.toISOString());
    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('rejects a missing or soft-deleted plant without touching the store', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(null);

    const action = buildUseCase(mocks).execute({ plantId: plantIdStr }, user);

    await expect(action).rejects.toThrow(DomainNotFoundException);
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.unitOfWork.runCount).toBe(0);
  });

  it('rejects and aborts the unit when a reactor throws while handling the fact', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(activePlant);
    mocks.add.mockResolvedValueOnce(true);
    mocks.publish.mockRejectedValueOnce(new Error('reactor failed'));

    const action = buildUseCase(mocks).execute({ plantId: plantIdStr }, user);

    await expect(action).rejects.toThrow();
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(mocks.unitOfWork.runCount).toBe(1);
  });
});
