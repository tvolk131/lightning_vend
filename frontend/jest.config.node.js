/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [`${__dirname}/server/**/*.test.(js|ts|tsx)`],
  testTimeout: 10000
};
