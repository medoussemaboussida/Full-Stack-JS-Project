// Configuration for MongoDB Memory Server

// Configure MongoDB Memory Server to use a version compatible with the Jenkins environment
const mongodbMemoryServerConfig = {
  binary: {
    version: '4.2.24', // Use an older version that has fewer dependencies
    skipMD5: true,
    checkMD5: false,
  },
  instance: {
    dbName: 'jest-test-db',
    args: ['--noscripting'], // Disable scripting for better compatibility
  },
  autoStart: false,
  // Try to use system MongoDB if available
  useSystemMongod: true,
};

module.exports = mongodbMemoryServerConfig;
