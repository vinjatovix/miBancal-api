import {
  type ManageableRole,
  UserRoles
} from '../../../../../src/Contexts/Auth/domain/value-objects/UserRoles.js';
import { InvalidArgumentException } from '../../../../../src/Contexts/shared/domain/errors/index.js';
import { UserMother } from '../mothers/UserMother.js';

describe('User.changeRoles', () => {
  const actor = 'acting-admin';
  const at = new Date('2026-10-17T10:00:00.000Z');

  const userWith = (roles: string[]) =>
    UserMother.create({
      roles: new UserRoles(roles),
      emailValidated: true
    });

  describe('grant', () => {
    it.each(['admin', 'collaborator'] as const)(
      'unions a missing "%s" role and records the acting admin and time',
      (role) => {
        const user = userWith(['user']);

        user.changeRoles([role], [], actor, at);

        expect(user.roles.has('user')).toBe(true);
        expect(user.roles.has(role)).toBe(true);
        expect(user.metadata.updatedBy).toBe(actor);
        expect(user.metadata.updatedAt).toEqual(at);
      }
    );

    it.each(['admin', 'collaborator'] as const)(
      'is an idempotent no-op when "%s" is already held',
      (role) => {
        const user = userWith(['user', role]);
        const before = user.metadata.updatedBy;

        user.changeRoles([role], [], actor, at);

        expect(user.roles.toPrimitives()).toEqual(
          expect.arrayContaining(['user', role])
        );
        expect(user.roles.value).toHaveLength(2);
        expect(user.metadata.updatedBy).toBe(before);
      }
    );
  });

  describe('revoke', () => {
    it.each(['admin', 'collaborator'] as const)(
      'yields the difference and updates audit when revoking "%s"',
      (role) => {
        const user = userWith(['user', role]);

        user.changeRoles([], [role], actor, at);

        expect(user.roles.has(role)).toBe(false);
        expect(user.roles.has('user')).toBe(true);
        expect(user.metadata.updatedBy).toBe(actor);
        expect(user.metadata.updatedAt).toEqual(at);
      }
    );

    it.each(['admin', 'collaborator'] as const)(
      'is an idempotent no-op when revoking "%s" from an account that lacks it',
      (role) => {
        const user = userWith(['user']);
        const before = user.metadata.updatedBy;

        user.changeRoles([], [role], actor, at);

        expect(user.roles.toPrimitives()).toEqual(['user']);
        expect(user.metadata.updatedBy).toBe(before);
      }
    );
  });

  describe('base role permanence', () => {
    it('always retains the base role "user" after any revoke', () => {
      const user = userWith(['user', 'admin']);

      user.changeRoles([], ['admin'], actor, at);

      expect(user.roles.has('user')).toBe(true);
    });

    it('throws when the resulting role set drops the base role "user"', () => {
      const user = userWith(['user']);

      expect(() =>
        user.changeRoles([], ['user' as unknown as ManageableRole], actor, at)
      ).toThrow(
        new InvalidArgumentException('<User> cannot drop the base role <user>')
      );
    });
  });
});
