import type { NextFunction } from 'express';
import httpStatus from 'http-status';

import { GetUserProfileController } from '../../../../../src/apps/agroApi/controllers/Users/GetUserProfileController.js';
import { updateUserProfileRequest } from '../../../../../src/apps/agroApi/controllers/Users/requestSchemas.js';
import { UpdateUserProfileController } from '../../../../../src/apps/agroApi/controllers/Users/UpdateUserProfileController.js';
import type { UserProfileView } from '../../../../../src/apps/agroApi/controllers/Users/userResponse.js';
import type { UserSessionInfo } from '../../../../../src/Contexts/Auth/application/index.js';
import {
  GetUserProfile,
  UpdateUserProfile
} from '../../../../../src/Contexts/Auth/application/useCases/index.js';
import { createUserId } from '../../../../../src/Contexts/Auth/domain/UserId.js';
import { AuthRepositoryMock } from '../../../../Contexts/Auth/__mocks__/index.js';
import { UserMother } from '../../../../Contexts/Auth/domain/mothers/UserMother.js';
import {
  buildNext,
  buildRequest,
  buildResponse,
  expectInternalErrorPassedTo,
  runWithValidation
} from '../../shared/fixtures/httpFakes.js';

describe('UserProfileControllers', () => {
  const sessionUser: UserSessionInfo = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'gardener',
    email: 'gardener@example.com',
    roles: ['user']
  };

  let repository: AuthRepositoryMock;
  let getController: GetUserProfileController;
  let patchController: UpdateUserProfileController;

  beforeEach(() => {
    repository = new AuthRepositoryMock();
    getController = new GetUserProfileController({
      getUserProfile: new GetUserProfile({ authRepository: repository })
    });
    patchController = new UpdateUserProfileController({
      updateUserProfile: new UpdateUserProfile({ authRepository: repository })
    });
  });

  describe('GetUserProfileController', () => {
    it('returns 200, UserProfileView (identity and roles), and strong ETag', async () => {
      const storedUser = UserMother.create({
        id: createUserId(sessionUser.id),
        version: 3
      });
      repository.setSearchByIdResult(storedUser);

      const req = buildRequest();
      const { res, status, json, set } = buildResponse({
        user: sessionUser
      });
      const next = buildNext();

      await getController.run(req, res, next as NextFunction);

      expect(status).toHaveBeenCalledWith(httpStatus.OK);
      const calls = json.mock.calls as UserProfileView[][];
      const body = calls[0]?.[0];
      expect(body?.id).toBe(sessionUser.id);
      expect(body?.username).toBe(storedUser.username.value);
      expect(body?.email).toBe(storedUser.email.value);
      expect(body?.version).toBe(3);
      expect(set).toHaveBeenCalledWith('ETag', '"3"');
      expect(next).not.toHaveBeenCalled();
    });

    it('passes error to next when usecase throws', async () => {
      repository.setSearchByIdResult(null);

      const req = buildRequest();
      const { res } = buildResponse({ user: sessionUser });
      const next = buildNext();

      await getController.run(req, res, next as NextFunction);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('UpdateUserProfileController', () => {
    it('returns 200, bumped version, and ETag when the version precondition is met', async () => {
      const storedUser = UserMother.create({
        id: createUserId(sessionUser.id),
        version: 0
      });
      repository.setSearchByIdResult(storedUser);
      repository.setUpdateProfileOutcome('written');

      const req = buildRequest({ body: {} });
      const { res, status, json, set } = buildResponse({
        user: sessionUser,
        expectedVersions: [0]
      });
      const next = buildNext();

      await expect(
        runWithValidation(updateUserProfileRequest, req, res)
      ).resolves.toBeUndefined();
      await patchController.run(req, res, next as NextFunction);

      expect(status).toHaveBeenCalledWith(httpStatus.OK);
      const calls = json.mock.calls as UserProfileView[][];
      const body = calls[0]?.[0];
      expect(body?.id).toBe(sessionUser.id);
      expect(body?.version).toBe(1);
      expect(set).toHaveBeenCalledWith('ETag', '"1"');
      expect(next).not.toHaveBeenCalled();
    });

    it('fails with internal error when route has no validation step', async () => {
      const storedUser = UserMother.create({
        id: createUserId(sessionUser.id),
        version: 0
      });
      repository.setSearchByIdResult(storedUser);

      const req = buildRequest({ body: {} });
      const { res } = buildResponse({
        user: sessionUser,
        expectedVersions: [0]
      });
      const next = buildNext();

      await patchController.run(req, res, next as NextFunction);

      expectInternalErrorPassedTo(next);
    });

    it('delegates errors to next when precondition fails', async () => {
      const storedUser = UserMother.create({
        id: createUserId(sessionUser.id),
        version: 2
      });
      repository.setSearchByIdResult(storedUser);

      const req = buildRequest({ body: {} });
      const { res } = buildResponse({
        user: sessionUser,
        expectedVersions: [1]
      });
      const next = buildNext();

      await expect(
        runWithValidation(updateUserProfileRequest, req, res)
      ).resolves.toBeUndefined();
      await patchController.run(req, res, next as NextFunction);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
