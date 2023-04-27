/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: [
    "dist"
  ],
  testTimeout: 10000,
  testEnvironment: "node"
};
