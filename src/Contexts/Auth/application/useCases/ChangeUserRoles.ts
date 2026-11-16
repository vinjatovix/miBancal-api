import type { UnitOfWork } from '../../../shared/application/interfaces/index.js';
import { ensureFound } from '../../../shared/application/utils/ensureFound.js';
import { ensureVersion } from '../../../shared/application/utils/ensureVersion.js';
import { DomainConflictException } from '../../../shared/domain/errors/index.js';
import type { UserPrimitives } from '../../domain/entities/types/UserPrimitives.js';
import type { User } from '../../domain/entities/User.js';
import type { AuthRepository } from '../../domain/repositories/interfaces/AuthRepository.js';
import type { ManageableRole } from '../../domain/value-objects/UserRoles.js';

const ADMIN_ROLE: ManageableRole = 'admin';

const LAST_ADMINISTRATOR_MESSAGE =
  'Cannot remove the last administrator of the platform';

export type ChangeUserRolesInput = {
  userId: string;
  add: ManageableRole[];
  remove: ManageableRole[];
};

export type ChangeUserRolesDependencies = {
  authRepository: AuthRepository;
  unitOfWork: UnitOfWork;
};

export class ChangeUserRoles {
  private readonly authRepository: AuthRepository;
  private readonly unitOfWork: UnitOfWork;

  constructor({ authRepository, unitOfWork }: ChangeUserRolesDependencies) {
    this.authRepository = authRepository;
    this.unitOfWork = unitOfWork;
  }

  /**
   * Runs the whole role change in one transaction. When the delta removes
   * `admin`, the shared guard is reserved first so two concurrent revokes of
   * the last two administrators collide: the loser is retried against
   * committed state, where only one administrator remains, and is refused with
   * the same last-administrator 409 a single over-eager revoke receives
   * (FR-002, FR-003, FR-004). `work` issues writes only and is safe to re-run.
   */
  async execute(
    input: ChangeUserRolesInput,
    actingAdminUsername: string,
    expectedVersions: readonly number[]
  ): Promise<UserPrimitives> {
    return this.unitOfWork.run(async () => {
      if (input.remove.includes(ADMIN_ROLE)) {
        await this.authRepository.reserveMinimumHolderGuard(ADMIN_ROLE);
      }

      const user = ensureFound(
        await this.authRepository.searchById(input.userId),
        'User',
        input.userId
      );
      ensureVersion(user.version, expectedVersions, 'User', input.userId);

      await this.ensureNotLastAdmin(user, input.remove);

      const before = user.toPrimitives();
      const at = new Date();

      user.changeRoles(input.add, input.remove, actingAdminUsername, at);

      const after = user.toPrimitives();

      // Always called: an empty diff is still confirmed against storage.
      user.syncVersion(await this.authRepository.updateRoles(before, after));

      return user.toPrimitives();
    });
  }

  /**
   * Last-administrator invariant (FR-007): a delta that would remove `admin`
   * from the only account holding it is refused with 409 before persisting.
   */
  private async ensureNotLastAdmin(
    user: User,
    remove: ManageableRole[]
  ): Promise<void> {
    const removesAdmin =
      remove.includes(ADMIN_ROLE) && user.roles.has(ADMIN_ROLE);
    if (!removesAdmin) {
      return;
    }

    const administrators = await this.authRepository.countByRole(ADMIN_ROLE);
    if (administrators <= 1) {
      throw new DomainConflictException(LAST_ADMINISTRATOR_MESSAGE);
    }
  }
}
