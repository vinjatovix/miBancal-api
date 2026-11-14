import { PlantLiked } from '../../../../../../src/Contexts/Agro/PlantLikes/domain/events/index.js';
import { IncrementLikeCountOnPlantLiked } from '../../../../../../src/Contexts/Agro/Plants/application/eventHandlers/IncrementLikeCountOnPlantLiked.js';
import type { PlantLikesCounterRepository } from '../../../../../../src/Contexts/Agro/Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import { random } from '../../../../shared/fixtures/random.js';

describe('IncrementLikeCountOnPlantLiked', () => {
  const buildMocks = () => {
    const increment = jest.fn().mockResolvedValue(undefined);
    const decrement = jest.fn().mockResolvedValue(undefined);
    const plantLikesCounterRepository = {
      increment,
      decrement
    } as unknown as PlantLikesCounterRepository;

    return { increment, decrement, plantLikesCounterRepository };
  };

  it('raises the counter of the liked plant exactly once', async () => {
    const mocks = buildMocks();
    const plantId = random.uuid();
    const event = new PlantLiked(random.uuid(), {
      plantId,
      userId: random.uuid(),
      likedAt: '2026-11-14T10:00:00.000Z'
    });

    await new IncrementLikeCountOnPlantLiked(mocks).handle(event);

    expect(mocks.increment).toHaveBeenCalledTimes(1);
    expect(mocks.increment).toHaveBeenCalledWith(plantId);
    expect(mocks.decrement).not.toHaveBeenCalled();
  });
});
