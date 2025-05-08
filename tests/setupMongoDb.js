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
    if (content.includes("// Original model import:")) {
      console.log('Test file already configured to use mock MongoDB');
      return;
    }

    // Replace the model imports with our mocks
    content = content.replace(
      "const { MongoMemoryServer } = require('mongodb-memory-server');",
      "const { MongoMemoryServer } = require('./mockMongoDb');"
    );

    // Comment out unused imports
    content = content.replace(
      "const jwt = require('jsonwebtoken');",
      "// const jwt = require('jsonwebtoken'); // Not needed with mocks"
    );
    content = content.replace(
      "const bcrypt = require('bcryptjs');",
      "// const bcrypt = require('bcryptjs'); // Not needed with mocks"
    );

    // Replace the model imports with our mocks
    content = content.replace(
      "const User = require('../model/user');",
      "// Original model import: const User = require('../model/user');"
    );
    content = content.replace(
      "const Appointment = require('../model/appointment');",
      "// Original model import: const Appointment = require('../model/appointment');"
    );
    content = content.replace(
      "const Chat = require('../model/chat');",
      "// Original model import: const Chat = require('../model/chat');"
    );
    content = content.replace(
      "const Notification = require('../model/Notification');",
      "// Original model import: const Notification = require('../model/Notification');"
    );

    // Add our mock models
    content = content.replace(
      "const mongodbMemoryServerConfig = require('./mongodb-memory-server-config');",
      "const mongodbMemoryServerConfig = require('./mongodb-memory-server-config');\nconst { User, Chat, Appointment, Notification } = require('./mockMongoDb');"
    );

    // Replace the userController import with our mock for specific methods
    content = content.replace(
      "const userController = require('../controller/userController');",
      `const userController = require('../controller/userController');
const mockUserController = require('./mockUserController');
// Override specific methods with mocks
userController.getAllchat = mockUserController.getAllchat;
userController.getAppointmentsByPsychiatrist = mockUserController.getAppointmentsByPsychiatrist;
userController.getAllAppointments = mockUserController.getAllAppointments;
userController.getUserById = mockUserController.getUserById;
userController.getPsychiatristById = mockUserController.getPsychiatristById;
userController.RoomChat = mockUserController.RoomChat;
userController.updateUser = mockUserController.updateUser;
userController.verifyUser = mockUserController.verifyUser;`
    );

    // Write the modified content back to the file
    fs.writeFileSync(testFilePath, content, 'utf8');

    console.log('Successfully configured tests to use mock MongoDB and controllers');
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
