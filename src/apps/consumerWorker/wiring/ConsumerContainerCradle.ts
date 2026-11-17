import type { AwilixContainer } from 'awilix';
import type { Admin, Consumer, Kafka, Producer } from 'kafkajs';
import type { Db, MongoClient } from 'mongodb';

import type { PlantLikesCounterConsumer } from '../../../Contexts/Agro/Plants/application/consumers/PlantLikesCounterConsumer.js';
import type { PlantLikesCounterRepository } from '../../../Contexts/Agro/Plants/domain/repositories/interfaces/PlantLikesCounterRepository.js';
import type { PlantRepository } from '../../../Contexts/Agro/Plants/domain/repositories/interfaces/PlantRepository.js';
import type {
  ConsumerDispatcher,
  DelayGate,
  FailureClassifier,
  MessagePublisher,
  RetryConfig,
  RetryContext,
  RetryPolicy,
  RetryRouter
} from '../../../Contexts/shared/application/consumers/index.js';
import type { UnitOfWork } from '../../../Contexts/shared/application/interfaces/index.js';
import type { ProcessedEventsRepository } from '../../../Contexts/shared/domain/events/index.js';
import type { AppLogger } from '../../../Contexts/shared/plugins/index.js';
import type { ConsumerConfig } from '../config/consumerConfig.js';

export type ConsumerContainerCradle = {
  db: Db;
  DBClient: MongoClient;
  logger: AppLogger;
  consumerConfig: ConsumerConfig;
  kafka: Kafka;
  kafkaConsumer: Consumer;
  retry: RetryConfig;
  retryKafka: Kafka;
  kafkaRetryProducer: Producer;
  kafkaRetryAdmin: Admin;
  retryTopicPartitions: number;
  retryReplicationFactor: number;
  messagePublisher: MessagePublisher;
  retryPolicy: RetryPolicy;
  failureClassifier: FailureClassifier;
  retryContext: RetryContext;
  delayGate: DelayGate;
  retryRouter: RetryRouter;
  processedEventsRepository: ProcessedEventsRepository;
  plantLikesCounterRepository: PlantLikesCounterRepository;
  plantRepository: PlantRepository;
  unitOfWork: UnitOfWork;
  plantLikesCounterConsumer: PlantLikesCounterConsumer;
  consumerDispatcher: ConsumerDispatcher;
};

export type ConsumerContainer = AwilixContainer<ConsumerContainerCradle>;

export type CreateConsumerContainerDeps = {
  db: Db;
  client: MongoClient;
  logger: AppLogger;
  consumerConfig: ConsumerConfig;
};
