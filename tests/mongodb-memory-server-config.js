// Configuration for MongoDB Memory Server
const { MongoMemoryServerOpts } = require('mongodb-memory-server-core');

// Configure MongoDB Memory Server to use a version compatible with older CPUs
// MongoDB 4.4.x is the last version that doesn't require AVX instructions
const mongodbMemoryServerConfig = {
  binary: {
    version: '4.4.18', // Use MongoDB 4.4.x which doesn't require AVX
    skipMD5: true,
  },
  instance: {
    dbName: 'jest-test-db',
  },
  autoStart: false,
};

module.exports = mongodbMemoryServerConfig;
