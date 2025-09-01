import { authLogger } from '../authLogger';

// Mock console methods
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

describe('AuthLogger', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Development Environment (NODE_ENV=development)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('debug logs messages with data in development', () => {
      const testMessage = 'Test debug message';
      const testData = { key: 'value', number: 42 };

      authLogger.debug(testMessage, testData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔐 Test debug message',
        testData
      );
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    test('debug logs messages without data in development', () => {
      const testMessage = 'Test debug message';

      authLogger.debug(testMessage);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔐 Test debug message',
        undefined
      );
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    test('error logs messages with Error objects in development', () => {
      const testMessage = 'Test error message';
      const testError = new Error('Test error details');

      authLogger.error(testMessage, testError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🔐 Test error message',
        testError
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    test('warn logs messages in development', () => {
      const testMessage = 'Test warning message';
      const testData = { severity: 'high' };

      authLogger.warn(testMessage, testData);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '🔐 Test warning message',
        testData
      );
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    test('info logs messages in development', () => {
      const testMessage = 'Test info message';
      const testData = { status: 'ok' };

      authLogger.info(testMessage, testData);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        '🔐 Test info message',
        testData
      );
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1);
    });

    test('performance logs timing data in development', () => {
      const operation = 'testOperation';
      const duration = 150.5;

      authLogger.performance(operation, duration);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏱️ testOperation took 150.50ms'
      );
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    test('performance formats duration correctly', () => {
      authLogger.performance('fastOp', 0.123456);
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱️ fastOp took 0.12ms');

      authLogger.performance('slowOp', 1234.56789);
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱️ slowOp took 1234.57ms');
    });
  });

  describe('Production Environment (NODE_ENV=production)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    test('debug does not log in production', () => {
      authLogger.debug('Should not appear', { sensitive: 'data' });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('error still logs in production (critical)', () => {
      const testError = new Error('Production error');
      authLogger.error('Critical error', testError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🔐 Critical error',
        testError
      );
    });

    test('warn does not log in production', () => {
      authLogger.warn('Should not appear');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('info does not log in production', () => {
      authLogger.info('Should not appear');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    test('performance does not log in production', () => {
      authLogger.performance('testOp', 100);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Other Environments', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    test('behaves like production in non-development environments', () => {
      authLogger.debug('Should not appear');
      authLogger.warn('Should not appear');
      authLogger.info('Should not appear');
      authLogger.performance('testOp', 100);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    test('error still logs in test environment', () => {
      const testError = new Error('Test error');
      authLogger.error('Test error message', testError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '🔐 Test error message',
        testError
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('handles undefined data gracefully', () => {
      authLogger.debug('Test with undefined', undefined);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔐 Test with undefined',
        undefined
      );
    });

    test('handles null data gracefully', () => {
      authLogger.debug('Test with null', null);
      expect(consoleLogSpy).toHaveBeenCalledWith('🔐 Test with null', null);
    });

    test('handles complex objects', () => {
      const complexData = {
        nested: { value: 42 },
        array: [1, 2, 3],
        date: new Date(),
        regex: /test/,
      };

      authLogger.debug('Complex object', complexData);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '🔐 Complex object',
        complexData
      );
    });
  });

  describe('Performance Logging Edge Cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('handles zero duration', () => {
      authLogger.performance('instantOp', 0);
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱️ instantOp took 0.00ms');
    });

    test('handles very small duration', () => {
      authLogger.performance('microOp', 0.001);
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱️ microOp took 0.00ms');
    });

    test('handles large duration', () => {
      authLogger.performance('slowOp', 999999.999);
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱️ slowOp took 1000000.00ms');
    });

    test('handles negative duration (should not happen in practice)', () => {
      authLogger.performance('negativeOp', -100);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '⏱️ negativeOp took -100.00ms'
      );
    });
  });
});
