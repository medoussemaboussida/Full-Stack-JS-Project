module.exports = {
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testPathIgnorePatterns: ['<rootDir>/Full-Stack-JS-Project-Frontend/'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  testTimeout: 30000, // Global timeout for all tests
  verbose: true,
  // Force Jest to exit after all tests complete
  forceExit: true,
  // Disable watchman for better CI compatibility
  watchman: false,
};