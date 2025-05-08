// Mock MongoDB Memory Server for environments where it can't be installed
const mongoose = require('mongoose');

class MockMongoMemoryServer {
  constructor() {
    this.uri = 'mongodb://localhost:27017/test-db';
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    return this;
  }

  async stop() {
    this.isRunning = false;
  }

  getUri() {
    return this.uri;
  }

  static async create() {
    const server = new MockMongoMemoryServer();
    await server.start();
    return server;
  }
}

// Mock mongoose connect to avoid actual connection
mongoose.connect = jest.fn().mockResolvedValue({
  connection: {
    db: {
      databaseName: 'test-db'
    }
  }
});

// Mock mongoose disconnect
mongoose.disconnect = jest.fn().mockResolvedValue(true);

// Mock mongoose model methods
const mockModel = {
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mock-id' })),
  deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  save: jest.fn().mockResolvedValue(true),
  updateOne: jest.fn().mockResolvedValue({ nModified: 1 }),
  findByIdAndDelete: jest.fn().mockResolvedValue(true),
  findByIdAndUpdate: jest.fn().mockResolvedValue(true),
};

// Export the mock
module.exports = {
  MongoMemoryServer: MockMongoMemoryServer,
  mockModel,
};
