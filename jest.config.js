module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@opennextjs/cloudflare$': '<rootDir>/__tests__/__mocks__/cloudflare.ts',
  },
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts'],
};
