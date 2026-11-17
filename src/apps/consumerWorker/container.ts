import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode
} from 'awilix';
import { Kafka } from 'kafkajs';

import { PlantLikesCounterConsumer } from '../../Contexts/Agro/Plants/application/consumers/PlantLikesCounterConsumer.js';
import type { PlantRepository } from '../../Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import { PlantQueryMapper } from '../../Contexts/Agro/Plants/infrastructure/persistence/mongo/mappers/PlantQueryMapper.js';
import { MongoPlantLikesCounterRepository } from '../../Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantLikesCounterRepository.js';
import { MongoPlantRepository } from '../../Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantRepository.js';
import { plantPersistenceMapper } from '../../Contexts/Agro/Plants/mappers/plantPersistenceMapper.js';
import {
  DelayGate,
  FailureClassifier,
  RetryContext,
  RetryPolicy,
  RetryRouter
} from '../../Contexts/shared/application/consumers/index.js';
import { KafkaMessagePublisher } from '../../Contexts/shared/infrastructure/consumers/index.js';
import { MongoProcessedEventsRepository } from '../../Contexts/shared/infrastructure/persistence/mongo/MongoProcessedEventsRepository.js';
import { MongoUnitOfWork } from '../../Contexts/shared/infrastructure/persistence/mongo/MongoUnitOfWork.js';
import type {
  ConsumerContainer,
  ConsumerContainerCradle,
  CreateConsumerContainerDeps
} from './wiring/ConsumerContainerCradle.js';
import { buildConsumerDispatcher } from './wiring/consumerRegistry.js';

export type {
  ConsumerContainer,
  ConsumerContainerCradle,
  CreateConsumerContainerDeps
} from './wiring/ConsumerContainerCradle.js';

export function createConsumerContainer({
  db,
  client,
  logger,
  consumerConfig
}: CreateConsumerContainerDeps): ConsumerContainer {
  const container = createContainer<ConsumerContainerCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true
  });

  container.register({
    db: asValue(db),
    DBClient: asValue(client),
    logger: asValue(logger),
    consumerConfig: asValue(consumerConfig),
    kafka: asFunction(
      ({ consumerConfig: config }: ConsumerContainerCradle) =>
        new Kafka({
          clientId: config.kafka.clientId,
          brokers: config.kafka.brokers
        })
    ).singleton(),
    kafkaConsumer: asFunction(
      ({ kafka, consumerConfig: config }: ConsumerContainerCradle) =>
        kafka.consumer({ groupId: config.kafka.consumerGroupId })
    ).singleton(),
    retry: asFunction(
      ({ consumerConfig: config }: ConsumerContainerCradle) => config.retry
    ).singleton(),
    retryKafka: asFunction(
      ({ consumerConfig: config }: ConsumerContainerCradle) =>
        new Kafka({
          clientId: config.retry.clientId,
          brokers: config.kafka.brokers
        })
    ).singleton(),
    kafkaRetryProducer: asFunction(
      ({ retryKafka: retryClient }: ConsumerContainerCradle) =>
        retryClient.producer()
    ).singleton(),
    kafkaRetryAdmin: asFunction(
      ({ retryKafka: retryClient }: ConsumerContainerCradle) =>
        retryClient.admin()
    ).singleton(),
    retryTopicPartitions: asFunction(
      ({ consumerConfig: config }: ConsumerContainerCradle) =>
        config.retry.topicPartitions
    ).singleton(),
    retryReplicationFactor: asFunction(
      ({ consumerConfig: config }: ConsumerContainerCradle) =>
        config.retry.replicationFactor
    ).singleton(),
    messagePublisher: asClass(KafkaMessagePublisher).singleton(),
    retryPolicy: asClass(RetryPolicy).singleton(),
    failureClassifier: asClass(FailureClassifier).singleton(),
    retryContext: asClass(RetryContext).singleton(),
    delayGate: asClass(DelayGate).singleton(),
    retryRouter: asClass(RetryRouter).singleton(),
    processedEventsRepository: asClass(
      MongoProcessedEventsRepository
    ).singleton(),
    plantLikesCounterRepository: asClass(
      MongoPlantLikesCounterRepository
    ).singleton(),
    plantRepository: asFunction(
      ({ db: database }: ConsumerContainerCradle): PlantRepository =>
        new MongoPlantRepository({
          db: database,
          plantPersistenceMapper,
          plantQueryMapper: new PlantQueryMapper()
        })
    ).singleton(),
    unitOfWork: asClass(MongoUnitOfWork).singleton(),
    plantLikesCounterConsumer: asClass(PlantLikesCounterConsumer).singleton(),
    consumerDispatcher: asFunction(() =>
      buildConsumerDispatcher(container)
    ).singleton()
  });

  return container;
}
