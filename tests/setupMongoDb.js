// Setup MongoDB for tests - decides whether to use real or mock MongoDB
const fs = require('fs');
const path = require('path');

// Check if we're running in CI environment
const isCI = process.env.CI === 'true' || process.env.JENKINS_URL;

// Check if we should use mock MongoDB
const useMockMongo = process.env.USE_MOCK_MONGO === 'true' || isCI;

// Path to the test file
const testFilePath = path.join(__dirname, 'userController.test.js');

// Function to modify the test file to use mock MongoDB
function setupMockMongo() {
  try {
    // Read the test file
    let content = fs.readFileSync(testFilePath, 'utf8');

    // Check if the file has already been modified
    if (content.includes("require('./mockMongoDb')")) {
      console.log('Test file already configured to use mock MongoDB');
      return;
    }

    // Replace the MongoDB Memory Server import with our mock
    content = content.replace(
      "const { MongoMemoryServer } = require('mongodb-memory-server');",
      "const { MongoMemoryServer } = require('./mockMongoDb');"
    );

    // Write the modified content back to the file
    fs.writeFileSync(testFilePath, content, 'utf8');

    console.log('Successfully configured tests to use mock MongoDB');
  } catch (error) {
    console.error('Error setting up mock MongoDB:', error);
    process.exit(1);
  }
}

// If we should use mock MongoDB, set it up
if (useMockMongo) {
  setupMockMongo();
}

module.exports = { useMockMongo };
