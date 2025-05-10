// Jest setup file
const { mockDb } = require('./mockMongoDb');

// Clear mock database before each test
beforeEach(() => {
  // Reset all mock data
  Object.keys(mockDb).forEach(key => {
    mockDb[key] = [];
  });
});

// Global timeout for all tests
jest.setTimeout(30000);
