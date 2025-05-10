// Script to reset the test file to its original state
const fs = require('fs');
const path = require('path');

// Path to the test file
const testFilePath = path.join(__dirname, 'userController.test.js');

// Original imports
const originalImports = [
  "const jwt = require('jsonwebtoken');",
  "const bcrypt = require('bcryptjs');",
  "const User = require('../model/user');",
  "const Appointment = require('../model/appointment');",
  "const Chat = require('../model/chat');",
  "const Notification = require('../model/Notification');",
  "const { MongoMemoryServer } = require('mongodb-memory-server');"
];

// Function to reset the test file
function resetTestFile() {
  try {
    // Read the test file
    let content = fs.readFileSync(testFilePath, 'utf8');

    // Check if the file has been modified
    if (!content.includes("// Original model import:")) {
      console.log('Test file is already in its original state');
      return;
    }

    // Reset imports
    content = content.replace(
      "// const jwt = require('jsonwebtoken'); // Not needed with mocks",
      "const jwt = require('jsonwebtoken');"
    );
    content = content.replace(
      "// const bcrypt = require('bcryptjs'); // Not needed with mocks",
      "const bcrypt = require('bcryptjs');"
    );

    // Reset model imports
    content = content.replace(
      "// Original model import: const User = require('../model/user');",
      "const User = require('../model/user');"
    );
    content = content.replace(
      "// Original model import: const Appointment = require('../model/appointment');",
      "const Appointment = require('../model/appointment');"
    );
    content = content.replace(
      "// Original model import: const Chat = require('../model/chat');",
      "const Chat = require('../model/chat');"
    );
    content = content.replace(
      "// Original model import: const Notification = require('../model/Notification');",
      "const Notification = require('../model/Notification');"
    );

    // Reset MongoMemoryServer import
    content = content.replace(
      "const { MongoMemoryServer } = require('./mockMongoDb');",
      "const { MongoMemoryServer } = require('mongodb-memory-server');"
    );

    // Remove mock models import
    content = content.replace(
      "const mongodbMemoryServerConfig = require('./mongodb-memory-server-config');\nconst { User, Chat, Appointment, Notification } = require('./mockMongoDb');",
      "const mongodbMemoryServerConfig = require('./mongodb-memory-server-config');"
    );

    // Remove mock controller overrides
    const mockControllerPattern = /const mockUserController = require\('\.\/mockUserController'\);[\s\S]*?userController\.verifyUser = mockUserController\.verifyUser;/;
    content = content.replace(mockControllerPattern, '');

    // Write the modified content back to the file
    fs.writeFileSync(testFilePath, content, 'utf8');

    console.log('Successfully reset test file to its original state');
  } catch (error) {
    console.error('Error resetting test file:', error);
    process.exit(1);
  }
}

// Run the reset function
resetTestFile();
