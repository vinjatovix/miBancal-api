import { asClass } from 'awilix';
import type { Db } from 'mongodb';
import { up as createRolesIndexAndGuard } from '../../../../../migrations/scripts/20261018120000-users-roles-index-and-admin-guard.js';
import { ChangeUserRoles } from '../../../../../src/Contexts/Auth/application/useCases/ChangeUserRoles.js';
import type { User } from '../../../../../src/Contexts/Auth/domain/entities/User.js';
import type { AuthRepository } from '../../../../../src/Contexts/Auth/domain/repositories/interfaces/AuthRepository.js';
import { UserRoles } from '../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { MongoAuthRepository } from '../../../../../src/Contexts/Auth/infrastructure/persistence/MongoAuthRepository.js';
import { DomainConflictException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import {
  createDbTestContext,
  type DbTestContext
} from '../../../../shared/infrastructure/persistence/mongo/dbTestContext.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

let context: DbTestContext;
let repository: AuthRepository;
let changeUserRoles: ChangeUserRoles;
let db: Db;

const actor = 'acting-admin';

const seedAdmin = async (): Promise<User> => {
  const admin = UserMother.create({
    roles: new UserRoles(['user', 'admin']),
    emailValidated: true
  });
  await repository.create(admin);
  return admin;
};

const revokeAdmin = (user: User): Promise<unknown> =>
  changeUserRoles.execute(
    { userId: user.id, add: [], remove: ['admin'] },
    actor,
    [user.version]
  );

describe('MongoAuthRepository role concurrency', () => {
  beforeAll(async () => {
    context = await createDbTestContext({
      authRepository: asClass(MongoAuthRepository).singleton(),
      changeUserRoles: asClass(ChangeUserRoles).scoped()
    });
    db = context.db;
    repository = context.container.resolve<AuthRepository>('authRepository');
    changeUserRoles =
      context.container.resolve<ChangeUserRoles>('changeUserRoles');
  });

  beforeEach(async () => {
    await context.reset();
    // reset() empties every collection, including the guard; re-seed it so the
    // shared contention point exists for each scenario.
    await createRolesIndexAndGuard(db);
  });

  afterAll(async () => {
    await context.close();
  });

  it('keeps at least one administrator when the last two are revoked concurrently', async () => {
    const first = await seedAdmin();
    const second = await seedAdmin();

    const [firstOutcome, secondOutcome] = await Promise.allSettled([
      revokeAdmin(first),
      revokeAdmin(second)
    ]);

    const statuses = [firstOutcome.status, secondOutcome.status].sort();
    expect(statuses).toEqual(['fulfilled', 'rejected']);

    const rejected = [firstOutcome, secondOutcome].find(
      (outcome): outcome is PromiseRejectedResult =>
        outcome.status === 'rejected'
    );
    expect(rejected?.reason).toBeInstanceOf(DomainConflictException);

    expect(await repository.countByRole('admin')).toBeGreaterThanOrEqual(1);
  });

  it('still refuses a single revoke of the only administrator with a 409', async () => {
    const onlyAdmin = await seedAdmin();

    await expect(revokeAdmin(onlyAdmin)).rejects.toBeInstanceOf(
      DomainConflictException
    );
    expect(await repository.countByRole('admin')).toBe(1);
  });

  it('revokes one administrator while three hold the role', async () => {
    const target = await seedAdmin();
    await seedAdmin();
    await seedAdmin();

    await revokeAdmin(target);

    expect(await repository.countByRole('admin')).toBe(2);
  });
});
