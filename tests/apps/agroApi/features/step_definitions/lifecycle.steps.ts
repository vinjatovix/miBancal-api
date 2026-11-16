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
  resetSuiteCache,
  seedMockGardenInputs,
  seedSuiteUsers,
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
  (await settledMailbox()).clear();
  resetSuiteCache();
  await suite().environmentArranger.arrange();
  await seedRolesIndexAndGuard(suite().client.db());
  await seedMockGardenInputs(suite().client.db());
  await seedSuiteUsers(suite().client.db());
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
