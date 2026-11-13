import type { Server } from 'node:http';
import { asValue, type NameAndRegistrationPair } from 'awilix';
import type { Binary, Db, MongoClient } from 'mongodb';

import { AgroBackApp } from '../../../../../../src/apps/agroApi/AgroBackApp.js';
import {
  createAppContainer,
  type AppContainer,
  type ContainerCradle
} from '../../../../../../src/apps/agroApi/container.js';
import type { AuthRepository } from '../../../../../../src/Contexts/Auth/domain/repositories/interfaces/AuthRepository.js';
import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import type {
  EncrypterTool,
  OneTimeTokenTool
} from '../../../../../../src/Contexts/shared/plugins/index.js';
import type { EnvironmentArranger } from '../../../../../../src/shared/infrastructure/arranger/EnvironmentArranger.js';
import {
  DBClientFactory,
  DBConfigFactory
} from '../../../../../../src/shared/infrastructure/persistence/index.js';
import { random } from '../../../../../Contexts/shared/fixtures/random.js';
import { SOURCE_ROOT } from '../../../../../shared/sourceRoot.js';
import { FakeGithubIdentityProvider } from '../../shared/fakes/FakeGithubIdentityProvider.js';
import { FakeGoogleIdTokenVerifier } from '../../shared/fakes/FakeGoogleIdTokenVerifier.js';
import {
  AnomalySeeder,
  FamilySeeder,
  GardenInputSeeder,
  PlantSeeder,
  UserSeeder
} from '../../shared/seeders/index.js';

export type SuiteRole = 'admin' | 'user' | 'anotherUser' | 'collaborator';

export interface SuiteResources {
  readonly app: AgroBackApp;
  readonly httpServer: Server;
  readonly client: MongoClient;
  readonly container: AppContainer;
  readonly appContainer: AppContainer;
  readonly environmentArranger: EnvironmentArranger;
  readonly tokens: Readonly<Record<SuiteRole, string>>;
  readonly ids: Readonly<Record<SuiteRole, string>>;
  readonly usernames: Readonly<Record<SuiteRole, string>>;
  readonly seeders: Readonly<{
    plant: ReturnType<typeof PlantSeeder>;
    family: ReturnType<typeof FamilySeeder>;
    anomaly: ReturnType<typeof AnomalySeeder>;
    gardenInput: ReturnType<typeof GardenInputSeeder>;
    user: ReturnType<typeof UserSeeder>;
  }>;
}

const SUITE_USERS: Readonly<
  Record<SuiteRole, { email: string; roles: string[] }>
> = {
  admin: { email: 'admin@tsapi.com', roles: ['admin'] },
  user: { email: 'user@tsapi.com', roles: ['user'] },
  anotherUser: { email: 'anotheruser@tsapi.com', roles: ['user'] },
  collaborator: { email: 'collaborator@tsapi.com', roles: ['collaborator'] }
};

const generateTokens = async (
  encrypter: EncrypterTool,
  ids: Readonly<Record<SuiteRole, string>>,
  usernames: Readonly<Record<SuiteRole, string>>
): Promise<Record<SuiteRole, string>> => {
  const tokenFor = async (role: SuiteRole): Promise<string> => {
    const token = await encrypter.generateToken({
      id: ids[role],
      email: SUITE_USERS[role].email,
      username: usernames[role],
      roles: SUITE_USERS[role].roles
    });
    if (!token) {
      throw new TypeError(`Could not generate the ${role} start-up token`);
    }

    return token;
  };

  return {
    admin: await tokenFor('admin'),
    user: await tokenFor('user'),
    anotherUser: await tokenFor('anotherUser'),
    collaborator: await tokenFor('collaborator')
  };
};

const buildSuite = async (): Promise<SuiteResources> => {
  const client = await DBClientFactory.createClient(
    'agroApi',
    DBConfigFactory.createConfig()
  );

  const overrides: NameAndRegistrationPair<ContainerCradle> = {
    googleIdTokenVerifier: asValue(new FakeGoogleIdTokenVerifier()),
    githubIdentityProvider: asValue(new FakeGithubIdentityProvider())
  };

  const container = await createAppContainer({
    db: client.db(),
    client,
    sourceRoot: SOURCE_ROOT,
    overrides
  });

  const environmentArranger = container.resolve<EnvironmentArranger>(
    'environmentArranger'
  );

  const app = new AgroBackApp({
    host: process.env.HOST || 'http://localhost',
    port: process.env.PORT || '0',
    sourceRoot: SOURCE_ROOT,
    overrides
  });

  await app.start(container.resolve('logger'));

  if (!app.httpServer) {
    throw new TypeError('HTTP server is not available');
  }

  const httpServer = app.httpServer;

  if (!app.container) {
    throw new TypeError('Application container is not available');
  }

  const appContainer = app.container;
  const encrypter = container.resolve<EncrypterTool>('encrypter');

  const ids: Record<SuiteRole, string> = {
    admin: random.uuid(),
    user: random.uuid(),
    anotherUser: random.uuid(),
    collaborator: random.uuid()
  };

  const usernames: Record<SuiteRole, string> = {
    admin: 'admin_user',
    user: 'regular_user',
    anotherUser: 'another_user',
    collaborator: 'collab_user'
  };

  const tokens = await generateTokens(encrypter, ids, usernames);

  return {
    app,
    httpServer,
    client,
    container,
    appContainer,
    environmentArranger,
    tokens,
    ids,
    usernames,
    seeders: {
      family: FamilySeeder(httpServer, tokens.admin),
      plant: PlantSeeder(httpServer, tokens.admin),
      anomaly: AnomalySeeder(httpServer, tokens.admin),
      gardenInput: GardenInputSeeder(httpServer, tokens.admin),
      user: UserSeeder({
        authRepository: container.resolve<AuthRepository>('authRepository'),
        encrypter,
        oneTimeToken: container.resolve<OneTimeTokenTool>('oneTimeToken')
      })
    }
  };
};

type SuiteUserDoc = { _id: Binary | string } & Record<string, unknown>;

export const seedSuiteUsers = async (db: Db): Promise<void> => {
  const usersCollection = db.collection<SuiteUserDoc>('users');
  const now = new Date();
  const suiteRes = suite();
  const rolesToSeed: SuiteRole[] = ['user', 'anotherUser'];

  await Promise.all(
    rolesToSeed.map((role) => {
      const id = suiteRes.ids[role];
      const username = suiteRes.usernames[role];
      const email = SUITE_USERS[role].email;
      const roles = SUITE_USERS[role].roles;

      return usersCollection.updateOne(
        { _id: toMongoId(id) },
        {
          $setOnInsert: {
            _id: toMongoId(id),
            email,
            username,
            emailValidated: true,
            roles,
            metadata: {
              createdAt: now,
              createdBy: username,
              updatedAt: now,
              updatedBy: username
            },
            version: 0
          }
        },
        { upsert: true }
      );
    })
  );
};

class SuiteHolder {
  #resources: SuiteResources | undefined;

  get(): Readonly<SuiteResources> {
    if (!this.#resources) {
      throw new TypeError('Suite resources not started');
    }

    return this.#resources;
  }

  async start(): Promise<void> {
    if (this.#resources) {
      throw new TypeError('Suite resources already started');
    }

    this.#resources = await buildSuite();
  }

  async stop(): Promise<void> {
    if (!this.#resources) {
      return;
    }

    const { app, client, container } = this.#resources;

    try {
      await app.stop(container.resolve('logger'));
    } finally {
      this.#resources = undefined;
      await client.close();
    }
  }
}

const holder = new SuiteHolder();

export const startSuite = (): Promise<void> => holder.start();

export const suite = (): Readonly<SuiteResources> => holder.get();

export const stopSuite = (): Promise<void> => holder.stop();

interface ClearableCache {
  clear: () => void;
}

const isClearable = (value: unknown): value is ClearableCache =>
  typeof (value as { clear?: unknown }).clear === 'function';

export const resetSuiteCache = (): void => {
  const { container, appContainer } = suite();
  for (const current of new Set([container, appContainer])) {
    const cache: unknown = current.resolve('cacheRepository');
    if (isClearable(cache)) {
      cache.clear();
    }
  }
};
