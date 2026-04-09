/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/services/**/*.ts',
    'src/repositories/**/*.ts',
    'src/subscriptionLifecycle.ts',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    'src/utils/': {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
};
