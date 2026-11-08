const shared = {
  testPathIgnorePatterns: ['/node_modules/', '/legacy/', '/prototypes/'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};

const sqlFiles = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'sql'],
  transform: {
    '\\.sql$': '<rootDir>/jest/sqlTransformer.js',
    '\\.[jt]sx?$': 'babel-jest',
  },
};

// Le code sans interface tourne sous Node pur : better-sqlite3 (module natif)
// ne fonctionne pas dans l'environnement React Native de jest-expo.
const nodeOnly = [
  '<rootDir>/src/domain/',
  '<rootDir>/src/data/',
  '<rootDir>/src/sync/',
  '<rootDir>/src/sources/',
];

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      ...shared,
      ...sqlFiles,
      displayName: 'node',
      testEnvironment: 'node',
      roots: nodeOnly,
      testMatch: ['**/*.test.ts'],
    },
    {
      ...shared,
      displayName: 'app',
      preset: 'jest-expo',
      testPathIgnorePatterns: [...shared.testPathIgnorePatterns, ...nodeOnly],
    },
  ],
};
