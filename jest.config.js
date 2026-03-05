module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 59,
      functions: 69,
      lines: 67,
      statements: 66,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  // Force proper cleanup to prevent "worker process failed to exit" errors
  testTimeout: 10000,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
