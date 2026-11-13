import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  aliasTo,
  asClass,
  asValue,
  createContainer,
  InjectionMode,
  type NameAndRegistrationPair
} from 'awilix';
import type { Db, MongoClient } from 'mongodb';

import { anomalyPersistenceMapper } from '../../Contexts/Agro/Anomalies/mappers/anomalyPersistenceMapper.js';
import { bedPersistenceMapper } from '../../Contexts/Agro/Beds/mappers/bedPersistenceMapper.js';
import { userBookmarksPersistenceMapper } from '../../Contexts/Agro/Bookmarks/mappers/userBookmarksPersistenceMapper.js';
import { familyPersistenceMapper } from '../../Contexts/Agro/Families/mappers/familyPersistenceMapper.js';
import { gardenInputPersistenceMapper } from '../../Contexts/Agro/GardenInputs/mappers/gardenInputPersistenceMapperImpl.js';
import { locationPersistenceMapper } from '../../Contexts/Agro/Locations/mappers/locationPersistenceMapper.js';
import { CropSpatialService } from '../../Contexts/Agro/PlantInstances/domain/services/CropSpatialService.js';
import { plantInstancePersistenceMapper } from '../../Contexts/Agro/PlantInstances/mappers/plantInstancePersistenceMapper.js';
import { plantLikePersistenceMapper } from '../../Contexts/Agro/PlantLikes/mappers/plantLikePersistenceMapper.js';
import { CompanionEvaluationService } from '../../Contexts/Agro/PlantRelations/domain/services/CompanionEvaluationService.js';
import { plantRelationPersistenceMapper } from '../../Contexts/Agro/PlantRelations/mappers/plantRelationPersistenceMapper.js';
import { plantPersistenceMapper } from '../../Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import { MailerAccountNotifier } from '../../Contexts/Auth/application/notifications/index.js';
import {
  ProviderUserResolver,
  SessionTokenIssuer
} from '../../Contexts/Auth/application/services/index.js';
import type { CacheRepository } from '../../Contexts/shared/application/cache/index.js';
import type { Mailer } from '../../Contexts/shared/application/mailer/index.js';
import { InProcessBackgroundTasks } from '../../Contexts/shared/infrastructure/background/index.js';
import { createCache } from '../../Contexts/shared/infrastructure/cache/index.js';
import { createMailer } from '../../Contexts/shared/infrastructure/mailer/index.js';
import { MongoUnitOfWork } from '../../Contexts/shared/infrastructure/persistence/mongo/MongoUnitOfWork.js';
import {
  buildLogger,
  type AppLogger
} from '../../Contexts/shared/plugins/index.js';
import { getEnvs } from './config/plugins/envs.plugin.js';
import { COMPONENT_ROLES } from './wiring/componentRoles.js';
import type {
  AppContainer,
  ContainerCradle
} from './wiring/ContainerCradle.js';
import { scanComponents } from './wiring/scanComponents.js';

export type { AppContainer, ContainerCradle };

export type ContainerDeps = {
  db: Db;
  client: MongoClient;
  sourceRoot: string;
};

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
) as { version: string };

export function buildExplicitRegistrations({
  db,
  client
}: Pick<
  ContainerDeps,
  'db' | 'client'
>): NameAndRegistrationPair<ContainerCradle> {
  const logger = buildLogger('agroApi');
  const envs = getEnvs();

  return {
    db: asValue(db),
    DBClient: asValue(client),
    appVersion: asValue(pkg.version),
    logger: asValue<AppLogger>(logger),
    bedPersistenceMapper: asValue(bedPersistenceMapper),
    familyPersistenceMapper: asValue(familyPersistenceMapper),
    anomalyPersistenceMapper: asValue(anomalyPersistenceMapper),
    gardenInputPersistenceMapper: asValue(gardenInputPersistenceMapper),
    locationPersistenceMapper: asValue(locationPersistenceMapper),
    plantPersistenceMapper: asValue(plantPersistenceMapper),
    plantInstancePersistenceMapper: asValue(plantInstancePersistenceMapper),
    userBookmarksPersistenceMapper: asValue(userBookmarksPersistenceMapper),
    plantLikePersistenceMapper: asValue(plantLikePersistenceMapper),
    plantRelationPersistenceMapper: asValue(plantRelationPersistenceMapper),
    cropSpatialService: asClass(CropSpatialService).singleton(),
    companionEvaluationService: asClass(CompanionEvaluationService).singleton(),
    unitOfWork: asClass(MongoUnitOfWork).singleton(),
    familySummaryReader: aliasTo('familyReadRepository'),
    plantSummaryReader: aliasTo('plantReadRepository'),
    mailer: asValue<Mailer>(
      createMailer({
        nodeEnv: envs.NODE_ENV,
        settings: {
          fromAddress: envs.MAIL_FROM_ADDRESS,
          fromName: envs.MAIL_FROM_NAME,
          resendApiKey: envs.RESEND_API_KEY,
          sendTimeoutMs: envs.MAIL_SEND_TIMEOUT_MS
        },
        logger,
        appVersion: pkg.version
      })
    ),
    cacheRepository: asValue<CacheRepository>(
      createCache({
        settings: {
          enabled: envs.CACHE_ENABLED,
          redisUrl: envs.REDIS_URL,
          backendTimeoutMs: envs.CACHE_BACKEND_TIMEOUT_MS,
          fallbackTtlSeconds: envs.CACHE_FALLBACK_TTL_SECONDS,
          fallbackMaxEntries: envs.CACHE_FALLBACK_MAX_ENTRIES
        },
        logger
      })
    ),
    cacheCatalogTtlSeconds: asValue(envs.CACHE_CATALOG_TTL_SECONDS),
    backgroundTasks: asClass(InProcessBackgroundTasks).singleton(),
    accountNotifier: asClass(MailerAccountNotifier).singleton(),
    providerUserResolver: asClass(ProviderUserResolver).singleton(),
    sessionTokenIssuer: asClass(SessionTokenIssuer).singleton(),
    frontendBaseUrl: asValue(envs.FRONTEND_BASE_URL),
    googleClientId: asValue(envs.GOOGLE_CLIENT_ID),
    githubClientId: asValue(envs.GITHUB_CLIENT_ID),
    githubClientSecret: asValue(envs.GITHUB_CLIENT_SECRET),
    githubRedirectUri: asValue(envs.GITHUB_REDIRECT_URI)
  };
}

export type CreateAppContainerDeps = ContainerDeps & {
  overrides?: NameAndRegistrationPair<ContainerCradle>;
};

export async function createAppContainer({
  overrides,
  ...deps
}: CreateAppContainerDeps): Promise<AppContainer> {
  const container = createContainer<ContainerCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true
  });

  container.register(buildExplicitRegistrations(deps));

  const components = await scanComponents(deps.sourceRoot, COMPONENT_ROLES);

  for (const component of components) {
    container.register({
      [component.registrationName]: asClass(component.class).setLifetime(
        component.lifetime
      )
    });
  }

  if (overrides) {
    container.register(overrides);
  }

  return container;
}
