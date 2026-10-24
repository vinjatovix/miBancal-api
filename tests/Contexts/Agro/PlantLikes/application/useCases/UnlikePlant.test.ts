import { UnlikePlant } from '../../../../../../src/Contexts/Agro/PlantLikes/application/useCases/UnlikePlant.js';
import type { PlantLikeRepository } from '../../../../../../src/Contexts/Agro/PlantLikes/domain/repositories/interfaces/PlantLikeRepository.js';
import type { Plant } from '../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import { createPlantId } from '../../../../../../src/Contexts/Agro/Plants/domain/PlantId.js';
import type { PlantLikesCounterRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import type { PlantRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/interfaces/index.js';
import { DomainNotFoundException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
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

    const increment = jest.fn().mockResolvedValue(undefined);
    const decrement = jest.fn().mockResolvedValue(undefined);
    const plantLikesCounterRepository = {
      increment,
      decrement
    } as unknown as PlantLikesCounterRepository;

    const unitOfWork = new UnitOfWorkMock();

    return {
      findActiveById,
      add,
      remove,
      find,
      increment,
      decrement,
      plantRepository,
      plantLikeRepository,
      plantLikesCounterRepository,
      unitOfWork
    };
  };

  const buildUseCase = (mocks: ReturnType<typeof buildMocks>): UnlikePlant =>
    new UnlikePlant({
      plantRepository: mocks.plantRepository,
      plantLikeRepository: mocks.plantLikeRepository,
      plantLikesCounterRepository: mocks.plantLikesCounterRepository,
      unitOfWork: mocks.unitOfWork
    });

  it('removes an existing like and decrements the counter', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(activePlant);
    mocks.remove.mockResolvedValueOnce(true);

    await buildUseCase(mocks).execute(plantIdStr, user);

    expect(mocks.remove).toHaveBeenCalledWith(user.id, plantIdStr);
    expect(mocks.decrement).toHaveBeenCalledWith(plantIdStr);
  });

  it('is idempotent when no like was present: no decrement', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(activePlant);
    mocks.remove.mockResolvedValueOnce(false);

    await buildUseCase(mocks).execute(plantIdStr, user);

    expect(mocks.decrement).not.toHaveBeenCalled();
  });

  it('rejects a missing or soft-deleted plant without touching the store', async () => {
    const mocks = buildMocks();
    mocks.findActiveById.mockResolvedValueOnce(null);

    const action = buildUseCase(mocks).execute(plantIdStr, user);

    await expect(action).rejects.toThrow(DomainNotFoundException);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.unitOfWork.runCount).toBe(0);
  });
});
