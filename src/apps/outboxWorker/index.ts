import { buildLogger } from '../../Contexts/shared/plugins/index.js';
import { OutboxWorkerApp } from './OutboxWorkerApp.js';

const logger = buildLogger('outboxWorker');
const app = new OutboxWorkerApp({ logger });

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}; shutting down the outbox worker`);
  try {
    await app.stop();
    process.exit(0);
  } catch (err) {
    logger.error('Error during outbox worker shutdown', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  console.error(`Uncaught Exception: ${err.message}, ${err.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  if (reason instanceof Error) {
    console.error(
      `Unhandled Rejection: ${reason.name} - ${reason.message}, ${reason.stack}`
    );
  } else {
    console.error(`Unhandled Rejection: ${JSON.stringify(reason)}`);
  }
  process.exit(1);
});

async function startWorker(): Promise<void> {
  try {
    await app.start();
  } catch (err) {
    console.error('Error starting the outbox worker:', err);
    process.exit(1);
  }
}

void startWorker();
