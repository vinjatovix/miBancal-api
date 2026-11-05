import { CheckPlantLike } from '../../../../../../src/Contexts/Agro/PlantLikes/application/useCases/CheckPlantLike.js';
import type { PlantLikeRepository } from '../../../../../../src/Contexts/Agro/PlantLikes/domain/repositories/interfaces/PlantLikeRepository.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/interfaces/index.js';
import { PlantLikeMother } from '../../domain/PlantLikeMother.js';

describe('CheckPlantLike', () => {
  const plantIdStr = '6ba7b810-9dad-11d1-80b4-00c04fd430c2';
  const user: UserSessionInfo = {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c1',
    username: 'farmer',
    roles: ['user'],
    email: 'farmer@example.com'
  };

  const buildMocks = () => {
    const add = jest.fn();
    const remove = jest.fn();
    const find = jest.fn();
    const plantLikeRepository = {
      add,
      remove,
      find
    } as unknown as PlantLikeRepository;

    return { find, plantLikeRepository };
  };

  it('returns liked true with the likedAt timestamp for a liker', async () => {
    const { find, plantLikeRepository } = buildMocks();
    const likedAt = new Date('2026-10-23T14:30:00.000Z');
    find.mockResolvedValueOnce(
      PlantLikeMother.of(user.id, plantIdStr, likedAt)
    );
    const useCase = new CheckPlantLike({ plantLikeRepository });

    const result = await useCase.execute(plantIdStr, user);

    expect(result).toEqual({ liked: true, likedAt: likedAt.toISOString() });
    expect(find).toHaveBeenCalledWith(user.id, plantIdStr);
  });

  it('returns liked false without a timestamp for a non-liker', async () => {
    const { find, plantLikeRepository } = buildMocks();
    find.mockResolvedValueOnce(null);
    const useCase = new CheckPlantLike({ plantLikeRepository });

    const result = await useCase.execute(plantIdStr, user);

    expect(result).toEqual({ liked: false });
  });
});
