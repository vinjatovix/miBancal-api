import {
  AfterAll,
  Before,
  BeforeAll,
  defineParameterType,
  setDefaultTimeout,
  setWorldConstructor
} from '@cucumber/cucumber';

import { up as seedRolesIndexAndGuard } from '../../../../../migrations/scripts/20261018120000-users-roles-index-and-admin-guard.js';
import {
  AgroWorld,
  settledMailbox,
  startSuite,
  stopSuite,
  suite,
  type Resource,
  type Role
} from './utils/index.js';

setDefaultTimeout(60 * 1000);

setWorldConstructor(AgroWorld);

BeforeAll(startSuite);

Before(async () => {
  // Emails still leaving from the previous scenario must not land in this one.
  (await settledMailbox()).clear();
  await suite().environmentArranger.arrange();
  // `arrange` empties every collection, including the migration-seeded
  // `roleGuards` singleton the admin-mutating transaction reserves. Re-seed it
  // (idempotent, same path as production) so revoke scenarios find it present.
  await seedRolesIndexAndGuard(suite().client.db());
});

AfterAll(stopSuite);

const ROLES: Readonly<Record<string, Role>> = {
  user: 'user',
  admin: 'admin',
  collaborator: 'collaborator',
  'logged-in': 'loggedIn'
};

defineParameterType({
  name: 'role',
  regexp: /logged-in|user|admin|collaborator/,
  transformer: (value: string): Role => {
    const role = ROLES[value];
    if (!role) {
      throw new TypeError(`Unknown role "${value}"`);
    }

    return role;
  }
});

defineParameterType({
  name: 'resource',
  regexp: /bed|plant|family/,
  transformer: (value: string): Resource => {
    if (value === 'plant' || value === 'family') return value;
    return 'bed';
  }
});
