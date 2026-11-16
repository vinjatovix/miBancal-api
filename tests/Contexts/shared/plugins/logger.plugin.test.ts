import type { AppLogger } from '../../../../src/Contexts/shared/plugins/logger.plugin.js';

type TransportOptions = { silent?: boolean; filename?: string };

type FakeLoggerInstance = {
  add: jest.Mock;
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  transports: unknown[];
};

type FakeWinston = {
  createLogger: jest.Mock<FakeLoggerInstance>;
  format: Record<string, jest.Mock>;
  transports: { File: jest.Mock; Console: jest.Mock; MongoDB: jest.Mock };
};

type Environment = { NODE_ENV: string; TEST_LOGS: boolean };

const ENVS_MODULE = '../../../../src/Contexts/shared/plugins/loggerEnv.js';
const LOGGER_MODULE =
  '../../../../src/Contexts/shared/plugins/logger.plugin.js';

const createFakeWinston = (): FakeWinston => {
  const loggerInstance: FakeLoggerInstance = {
    add: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    transports: []
  };

  return {
    createLogger: jest.fn(() => loggerInstance),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      json: jest.fn(),
      colorize: jest.fn(),
      printf: jest.fn()
    },
    transports: { File: jest.fn(), Console: jest.fn(), MongoDB: jest.fn() }
  };
};

const loadLoggerWith = (environment: Environment): FakeWinston => {
  const winston = createFakeWinston();

  jest.isolateModules(() => {
    jest.doMock('winston', () => ({ __esModule: true, default: winston }));
    jest.doMock('winston-mongodb', () => ({}));
    jest.doMock(ENVS_MODULE, () => ({ getLoggerEnv: () => environment }));
    const { buildLogger } = jest.requireActual<{
      buildLogger: (s: string) => AppLogger;
    }>(LOGGER_MODULE);
    buildLogger('test').info('trigger');
  });

  return winston;
};

const consoleOptions = (winston: FakeWinston): TransportOptions[] =>
  winston.transports.Console.mock.calls.map(
    ([options]: [TransportOptions]) => options
  );

describe('logger plugin transports', () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe('under test', () => {
    it('should build no file transport', () => {
      const winston = loadLoggerWith({ NODE_ENV: 'test', TEST_LOGS: false });

      expect(winston.transports.File).not.toHaveBeenCalled();
    });

    it('should keep the console silent by default', () => {
      const winston = loadLoggerWith({ NODE_ENV: 'test', TEST_LOGS: false });

      expect(consoleOptions(winston)).toEqual([
        expect.objectContaining({ silent: true })
      ]);
    });

    it('should print to the console when test logs are enabled', () => {
      const winston = loadLoggerWith({ NODE_ENV: 'test', TEST_LOGS: true });

      expect(consoleOptions(winston)).toEqual([
        expect.objectContaining({ silent: false })
      ]);
      expect(winston.transports.File).not.toHaveBeenCalled();
    });
  });

  describe('under development', () => {
    it('should build both file transports and a printing console', () => {
      const winston = loadLoggerWith({
        NODE_ENV: 'development',
        TEST_LOGS: false
      });

      expect(winston.transports.File).toHaveBeenCalledTimes(2);
      expect(consoleOptions(winston)).toEqual([
        expect.objectContaining({ silent: false })
      ]);
    });
  });

  describe('under production', () => {
    it('should build both file transports and no console', () => {
      const winston = loadLoggerWith({
        NODE_ENV: 'production',
        TEST_LOGS: false
      });

      expect(winston.transports.File).toHaveBeenCalledTimes(2);
      expect(winston.transports.Console).not.toHaveBeenCalled();
    });
  });

  describe('buildLogger metadata propagation', () => {
    it('forwards message and metadata to winston on debug and info', () => {
      const winston = createFakeWinston();
      let logger!: AppLogger;

      jest.isolateModules(() => {
        jest.doMock('winston', () => ({ __esModule: true, default: winston }));
        jest.doMock('winston-mongodb', () => ({}));
        jest.doMock(ENVS_MODULE, () => ({
          getLoggerEnv: () => ({ NODE_ENV: 'test', TEST_LOGS: false })
        }));
        const { buildLogger } = jest.requireActual<{
          buildLogger: (s: string) => AppLogger;
        }>(LOGGER_MODULE);
        logger = buildLogger('myService');
      });

      logger.debug('debug msg', { extra: 'debugValue' });
      const rootLogger = winston.createLogger.mock.results[0]
        ?.value as FakeLoggerInstance;

      expect(rootLogger.debug).toHaveBeenCalledWith({
        service: 'myService',
        message: 'debug msg',
        extra: 'debugValue'
      });

      logger.info('info msg', { count: 42 });
      expect(rootLogger.info).toHaveBeenCalledWith({
        service: 'myService',
        message: 'info msg',
        count: 42
      });
    });

    it('forwards message, error stack, and metadata to winston on warn and error', () => {
      const winston = createFakeWinston();
      let logger!: AppLogger;

      jest.isolateModules(() => {
        jest.doMock('winston', () => ({ __esModule: true, default: winston }));
        jest.doMock('winston-mongodb', () => ({}));
        jest.doMock(ENVS_MODULE, () => ({
          getLoggerEnv: () => ({ NODE_ENV: 'test', TEST_LOGS: false })
        }));
        const { buildLogger } = jest.requireActual<{
          buildLogger: (s: string) => AppLogger;
        }>(LOGGER_MODULE);
        logger = buildLogger('myService');
      });

      const testError = new Error('boom');

      logger.warn('warn msg', testError, { attempt: 3 });
      const rootLogger = winston.createLogger.mock.results[0]
        ?.value as FakeLoggerInstance;

      expect(rootLogger.warn).toHaveBeenCalledWith({
        service: 'myService',
        message: 'warn msg',
        error: testError.stack,
        attempt: 3
      });

      logger.error('error msg', testError, { critical: true });
      expect(rootLogger.error).toHaveBeenCalledWith({
        service: 'myService',
        message: 'error msg',
        error: testError.stack,
        critical: true
      });
    });
  });
});
