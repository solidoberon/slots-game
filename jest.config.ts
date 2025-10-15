import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    // If tests import asset paths accidentally, map them to a stub
    '^.+\\.(png|jpg|jpeg|gif|svg|mp3|webm)$': '<rootDir>/tests/stubs/fileStub.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
};

export default config;
