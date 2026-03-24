/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  clearMocks: true,
  verbose: true,
  testTimeout: 60000,
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        isolatedModules: true,
      },
    ],
  },
};
