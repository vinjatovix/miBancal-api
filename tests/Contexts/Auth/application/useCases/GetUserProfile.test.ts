import { GetUserProfile } from '../../../../../src/Contexts/Auth/application/useCases/GetUserProfile.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { DomainNotFoundException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { AuthRepositoryMock } from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

describe('GetUserProfile', () => {
  let repository: AuthRepositoryMock;
  let useCase: GetUserProfile;

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    useCase = new GetUserProfile({ authRepository: repository });
  });

  it('retrieves user identity, roles and version', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const user = UserMother.create({
      id: createUserId(userId),
      version: 2
    });
    repository.setSearchByIdResult(user);

    const result = await useCase.execute(userId);

    repository.assertSearchByIdHasBeenCalledWith(userId);
    expect(result.id).toBe(userId);
    expect(result.username).toBe(user.username.value);
    expect(result.email).toBe(user.email.value);
    expect(result.roles).toEqual(user.roles.toPrimitives());
    expect(result.version).toBe(2);
  });

  it('throws DomainNotFoundException when user is not found', async () => {
    const missingUserId = '22222222-2222-4222-8222-222222222222';
    repository.setSearchByIdResult(null);

    await expect(useCase.execute(missingUserId)).rejects.toBeInstanceOf(
      DomainNotFoundException
    );
  });
});
