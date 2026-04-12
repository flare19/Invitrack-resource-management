import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/src/test/tsconfig.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['**/__tests__/**/*.integration.test.ts'],
      globalSetup: '<rootDir>/src/test/globalSetup.ts',
      globalTeardown: '<rootDir>/src/test/globalTeardown.ts',
      setupFiles: ['<rootDir>/src/test/envSetup.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/src/test/tsconfig.json' }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
};

export default config;