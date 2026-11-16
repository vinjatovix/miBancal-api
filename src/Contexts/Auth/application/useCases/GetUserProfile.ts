import { ensureFound } from '../../../shared/application/utils/ensureFound.js';
import type { UserPrimitives } from '../../domain/entities/types/UserPrimitives.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';

export type GetUserProfileDependencies = {
  authRepository: AuthRepository;
};

export class GetUserProfile {
  private readonly authRepository: AuthRepository;

  constructor({ authRepository }: GetUserProfileDependencies) {
    this.authRepository = authRepository;
  }

  async execute(userId: string): Promise<UserPrimitives> {
    const user = ensureFound(
      await this.authRepository.searchById(userId),
      'User',
      userId
    );

    return user.toPrimitives();
  }
}
