module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/basic-setup.ts'],
  moduleNameMapper: {
    '^@sentry/react-native$': '<rootDir>/src/__mocks__/@sentry/react-native.ts',
    '^posthog-react-native$': '<rootDir>/src/__mocks__/posthog-react-native.ts',
    '^@/shared/lib/analytics$': '<rootDir>/src/__mocks__/@shared/lib/analytics.ts',
    '^@/lib/(.*)$': '<rootDir>/src/shared/lib/$1',
    '^@/constants/(.*)$': '<rootDir>/src/shared/config/$1',
    '^@/types/(.*)$': '<rootDir>/src/shared/types/$1',
    '^@/providers/(.*)$': '<rootDir>/src/app/providers/$1',
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/index.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  clearMocks: true,
  resetMocks: true,
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};