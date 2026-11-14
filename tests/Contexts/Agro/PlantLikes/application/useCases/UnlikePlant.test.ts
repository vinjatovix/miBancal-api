import { UnlikePlant } from '../../../../../../src/Contexts/Agro/PlantLikes/application/useCases/UnlikePlant.js';
import { PlantUnliked } from '../../../../../../src/Contexts/Agro/PlantLikes/domain/events/index.js';
import type { PlantLikeRepository } from '../../../../../../src/Contexts/Agro/PlantLikes/domain/repositories/interfaces/PlantLikeRepository.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { PlantRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/interfaces/index.js';
import type { EventBus } from '../../../../../../src/Contexts/shared/application/eventBus/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import type { DomainEvent } from '../../../../../../src/Contexts/shared/domain/events/index.js';
import { UnitOfWorkMock } from '../../../../shared/__mocks__/UnitOfWorkMock.js';

describe('UnlikePlant', () => {
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

  const buildUseCase = (mocks: ReturnType<typeof buildMocks>): UnlikePlant =>
    new UnlikePlant({
      plantRepository: mocks.plantRepository,
      plantLikeRepository: mocks.plantLikeRepository,
      eventBus: mocks.eventBus,
      unitOfWork: mocks.unitOfWork
    });

  it('announces a plant.unliked fact when an existing like is removed', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(activePlant);
    mocks.remove.mockResolvedValueOnce(true);

    await buildUseCase(mocks).execute(plantIdStr, user);

    expect(mocks.remove).toHaveBeenCalledWith(user.id, plantIdStr);
    expect(mocks.publish).toHaveBeenCalledTimes(1);

    const [firstCall] = mocks.publish.mock.calls;
    const published = firstCall?.[0] ?? [];
    expect(published).toHaveLength(1);

    const [event] = published;
    expect(event).toBeInstanceOf(PlantUnliked);
    expect(event?.payload).toEqual({
      plantId: plantIdStr,
      userId: user.id
    });
  });

  it('announces nothing when no like was present', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(activePlant);
    mocks.remove.mockResolvedValueOnce(false);

    await buildUseCase(mocks).execute(plantIdStr, user);

    expect(mocks.publish).not.toHaveBeenCalled();
  });

  it('rejects a missing or soft-deleted plant without touching the store', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(null);

    const action = buildUseCase(mocks).execute(plantIdStr, user);

    await expect(action).rejects.toThrow(DomainNotFoundException);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.unitOfWork.runCount).toBe(0);
  });

  it('rejects and aborts the unit when a reactor throws while handling the fact', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(activePlant);
    mocks.remove.mockResolvedValueOnce(true);
    mocks.publish.mockRejectedValueOnce(new Error('reactor failed'));

    const action = buildUseCase(mocks).execute(plantIdStr, user);

    await expect(action).rejects.toThrow();
    expect(mocks.publish).toHaveBeenCalledTimes(1);
    expect(mocks.unitOfWork.runCount).toBe(1);
  });
});
