import { UpdateUserProfile } from '../../../../../src/Contexts/Auth/application/useCases/UpdateUserProfile.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { AuthRepositoryMock } from '../../__mocks__/index.js';
import { UserMother } from '../../domain/mothers/UserMother.js';

describe('UpdateUserProfile', () => {
  let repository: AuthRepositoryMock;
  let useCase: UpdateUserProfile;

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    useCase = new UpdateUserProfile({ authRepository: repository });
  });

  it('returns the profile when the version matches', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const user = UserMother.create({
      id: createUserId(userId),
      version: 0
    });
    repository.setSearchByIdResult(user);
    repository.setUpdateProfileOutcome('unchanged');

    const result = await useCase.execute({ userId }, [0]);

    expect(result.id).toBe(userId);
    expect(result.version).toBe(0);
  });

  it('throws DomainNotFoundException when user does not exist', async () => {
    const missingUserId = '22222222-2222-4222-8222-222222222222';
    repository.setSearchByIdResult(null);

    await expect(
      useCase.execute({ userId: missingUserId }, [0])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
  });

  it('throws DomainStaleVersionException when expected version does not match actual version', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const user = UserMother.create({
      id: createUserId(userId),
      version: 5
    });
    repository.setSearchByIdResult(user);

    await expect(useCase.execute({ userId }, [4])).rejects.toBeInstanceOf(
      DomainStaleVersionException
    );
  });
});
