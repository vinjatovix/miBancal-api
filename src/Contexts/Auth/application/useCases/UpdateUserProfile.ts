import { ensureFound } from '../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../shared/application/utils/ensureVersion.js';
import type { UserPrimitives } from '../../domain/entities/types/UserPrimitives.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';

export type UpdateUserProfileInput = {
  userId: string;
};

export type UpdateUserProfileDependencies = {
  authRepository: AuthRepository;
};

/**
 * Identity and roles carry no editable fields through this endpoint
 * (research.md Decision 4 — geography was removed, FR-006/007): the
 * request body is always `{}`, so this only confirms the version
 * precondition against storage and returns the profile unchanged. The
 * plumbing is kept so the endpoint stays available for future
 * non-geographic editable fields.
 */
export class UpdateUserProfile {
  private readonly authRepository: AuthRepository;

  constructor({ authRepository }: UpdateUserProfileDependencies) {
    this.authRepository = authRepository;
  }

  async execute(
    input: UpdateUserProfileInput,
    expectedVersions: readonly number[]
  ): Promise<UserPrimitives> {
    const user = ensureFound(
      await this.authRepository.searchById(input.userId),
      'User',
      input.userId
    );

    ensureVersion(user.version, expectedVersions, 'User', input.userId);

    const primitives = user.toPrimitives();
    const outcome = await this.authRepository.updateProfile(
      primitives,
      primitives
    );
    user.syncVersion(outcome);

    return user.toPrimitives();
  }
}
