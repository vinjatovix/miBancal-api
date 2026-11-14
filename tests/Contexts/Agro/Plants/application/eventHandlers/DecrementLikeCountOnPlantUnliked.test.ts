import { PlantUnliked } from '../../../../../../src/Contexts/Agro/PlantLikes/domain/events/index.js';
import { DecrementLikeCountOnPlantUnliked } from '../../../../../../src/Contexts/Agro/Plants/application/eventHandlers/DecrementLikeCountOnPlantUnliked.js';
import type { PlantLikesCounterRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import { random } from '../../../../shared/fixtures/random.js';

describe('DecrementLikeCountOnPlantUnliked', () => {
  const buildMocks = () => {
    const increment = jest.fn().mockResolvedValue(undefined);
    const decrement = jest.fn().mockResolvedValue(undefined);
    const plantLikesCounterRepository = {
      increment,
      decrement
    } as unknown as PlantLikesCounterRepository;

    return { increment, decrement, plantLikesCounterRepository };
  };

  it('lowers the counter of the unliked plant exactly once', async () => {
    const mocks = buildMocks();
    const plantId = random.uuid();
    const event = new PlantUnliked(plantId, {
      plantId,
      userId: random.uuid()
    });

    await new DecrementLikeCountOnPlantUnliked(mocks).handle(event);

    expect(mocks.decrement).toHaveBeenCalledTimes(1);
    expect(mocks.decrement).toHaveBeenCalledWith(plantId);
    expect(mocks.increment).not.toHaveBeenCalled();
  });

  it('forwards every unlike to the counter without applying its own floor', async () => {
    const mocks = buildMocks();
    const plantId = random.uuid();
    const event = new PlantUnliked(plantId, {
      plantId,
      userId: random.uuid()
    });

    await new DecrementLikeCountOnPlantUnliked(mocks).handle(event);
    await new DecrementLikeCountOnPlantUnliked(mocks).handle(event);

    expect(mocks.decrement).toHaveBeenCalledTimes(2);
    expect(mocks.decrement).toHaveBeenNthCalledWith(1, plantId);
    expect(mocks.decrement).toHaveBeenNthCalledWith(2, plantId);
  });
});
