// Mock @sentry/react-native
const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockWrap = jest.fn((component) => component);

jest.mock('@sentry/react-native', () => ({
  init: mockInit,
  captureException: mockCaptureException,
  wrap: mockWrap,
}));

describe('sentry', () => {
  let mockConsoleLog: jest.SpyInstance;
  let originalDev: boolean;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    originalDev = global.__DEV__;
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    global.__DEV__ = originalDev;
    // Clear the module cache to allow re-import with different env
    jest.resetModules();
  });

  describe('initSentry', () => {
    describe('when DSN is not set', () => {
      it('should not call Sentry.init', () => {
        delete process.env.EXPO_PUBLIC_SENTRY_DSN;
        const { initSentry } = require('../sentry');

        initSentry();
        expect(mockInit).not.toHaveBeenCalled();
      });

      it('should log message in development mode', () => {
        delete process.env.EXPO_PUBLIC_SENTRY_DSN;
        global.__DEV__ = true;
        const { initSentry } = require('../sentry');

        initSentry();
        expect(mockConsoleLog).toHaveBeenCalledWith('Sentry DSN not set, skipping initialization');
      });

      it('should not log message in production mode', () => {
        delete process.env.EXPO_PUBLIC_SENTRY_DSN;
        global.__DEV__ = false;
        const { initSentry } = require('../sentry');

        initSentry();
        expect(mockConsoleLog).not.toHaveBeenCalled();
      });
    });

    describe('when DSN is set', () => {
      const testDsn = 'https://test@sentry.io/123456';

      it('should call Sentry.init with correct config in development mode', () => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
        global.__DEV__ = true;
        const { initSentry } = require('../sentry');

        initSentry();

        expect(mockInit).toHaveBeenCalledTimes(1);
        expect(mockInit).toHaveBeenCalledWith({
          dsn: testDsn,
          enabled: false,
          tracesSampleRate: 1.0,
          sendDefaultPii: false,
        });
      });

      it('should call Sentry.init with correct config in production mode', () => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
        global.__DEV__ = false;
        const { initSentry } = require('../sentry');

        initSentry();

        expect(mockInit).toHaveBeenCalledTimes(1);
        expect(mockInit).toHaveBeenCalledWith({
          dsn: testDsn,
          enabled: true,
          tracesSampleRate: 0.2,
          sendDefaultPii: false,
        });
      });

      it('should not log message when DSN is present', () => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
        global.__DEV__ = true;
        const { initSentry } = require('../sentry');

        initSentry();
        expect(mockConsoleLog).not.toHaveBeenCalled();
      });
    });

    describe('configuration values', () => {
      const testDsn = 'https://test@sentry.io/123456';

      it('should always set sendDefaultPii to false', () => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
        const { initSentry } = require('../sentry');

        initSentry();
        const config = mockInit.mock.calls[0][0];
        expect(config.sendDefaultPii).toBe(false);
      });

      it('should set enabled to false in dev mode', () => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
        global.__DEV__ = true;
        const { initSentry } = require('../sentry');

        initSentry();
        const config = mockInit.mock.calls[0][0];
        expect(config.enabled).toBe(false);
      });

      it('should set enabled to true in production mode', () => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
        global.__DEV__ = false;
        const { initSentry } = require('../sentry');

        initSentry();
        const config = mockInit.mock.calls[0][0];
        expect(config.enabled).toBe(true);
      });

      it('should use 100% sampling rate in dev mode', () => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
        global.__DEV__ = true;
        const { initSentry } = require('../sentry');

        initSentry();
        const config = mockInit.mock.calls[0][0];
        expect(config.tracesSampleRate).toBe(1.0);
      });

      it('should use 20% sampling rate in production mode', () => {
        process.env.EXPO_PUBLIC_SENTRY_DSN = testDsn;
        global.__DEV__ = false;
        const { initSentry } = require('../sentry');

        initSentry();
        const config = mockInit.mock.calls[0][0];
        expect(config.tracesSampleRate).toBe(0.2);
      });
    });
  });

  describe('Sentry export', () => {
    it('should export Sentry object', () => {
      const { Sentry } = require('../sentry');
      expect(Sentry).toBeDefined();
    });

    it('should have init method', () => {
      const { Sentry } = require('../sentry');
      expect(Sentry.init).toBeDefined();
      expect(typeof Sentry.init).toBe('function');
    });

    it('should have captureException method', () => {
      const { Sentry } = require('../sentry');
      expect(Sentry.captureException).toBeDefined();
      expect(typeof Sentry.captureException).toBe('function');
    });

    it('should have wrap method', () => {
      const { Sentry } = require('../sentry');
      expect(Sentry.wrap).toBeDefined();
      expect(typeof Sentry.wrap).toBe('function');
    });
  });
});
