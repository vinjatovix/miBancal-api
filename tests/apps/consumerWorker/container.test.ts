import type { MongoClient } from 'mongodb';

import { createConsumerContainer } from '../../../src/apps/consumerWorker/container.js';
import { PlantLikesCounterConsumer } from '../../../src/Contexts/Agro/Plants/application/consumers/PlantLikesCounterConsumer.js';
import { MongoPlantLikesCounterRepository } from '../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantLikesCounterRepository.js';
import { MongoPlantRepository } from '../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/MongoPlantRepository.js';
import { MongoProcessedEventsRepository } from '../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoProcessedEventsRepository.js';
import { MongoUnitOfWork } from '../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoUnitOfWork.js';
import type { AppLogger } from '../../../src/Contexts/shared/plugins/logger.plugin.js';

describe('createConsumerContainer', () => {
  const logger: AppLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  const collection = jest.fn().mockReturnValue({});
  const db = { collection } as unknown as Parameters<
    typeof createConsumerContainer
  >[0]['db'];
  const client = {
    db: jest.fn().mockReturnValue(db)
  } as unknown as MongoClient;

  const consumerConfig = {
    kafka: {
      brokers: ['localhost:9092'],
      topic: 'agro.domain.events',
      consumerGroupId: 'test-group',
      clientId: 'test-client'
    },
    processedEventsTtlSeconds: 1209600,
    topicRetentionSeconds: 604800
  };

  it('registers and resolves all expected services in the cradle', () => {
    const container = createConsumerContainer({
      db,
      client,
      logger,
      consumerConfig
    });

    expect(container.resolve('db')).toBe(db);
    expect(container.resolve('DBClient')).toBe(client);
    expect(container.resolve('logger')).toBe(logger);
    expect(container.resolve('consumerConfig')).toBe(consumerConfig);
    expect(container.resolve('kafka')).toBeDefined();
    expect(container.resolve('kafkaConsumer')).toBeDefined();
    expect(container.resolve('processedEventsRepository')).toBeInstanceOf(
      MongoProcessedEventsRepository
    );
    expect(container.resolve('plantLikesCounterRepository')).toBeInstanceOf(
      MongoPlantLikesCounterRepository
    );
    expect(container.resolve('plantRepository')).toBeInstanceOf(
      MongoPlantRepository
    );
    expect(container.resolve('unitOfWork')).toBeInstanceOf(MongoUnitOfWork);
    expect(container.resolve('plantLikesCounterConsumer')).toBeInstanceOf(
      PlantLikesCounterConsumer
    );
  });
});
