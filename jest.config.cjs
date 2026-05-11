module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  // Playwright specs live alongside Jest specs but use a different runner;
  // skip them here so `npm run test` doesn't try to load Playwright's
  // test() API inside Jest. They run via `npm run test:e2e`.
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/e2e/', '/backend/'],
};
