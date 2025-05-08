// Mock MongoDB Memory Server for environments where it can't be installed
const mongoose = require('mongoose');

// In-memory data store for our mock database
const mockDb = {
  users: [],
  chats: [],
  appointments: [],
  notifications: []
};

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
    // Clear mock database on stop
    mockDb.users = [];
    mockDb.chats = [];
    mockDb.appointments = [];
    mockDb.notifications = [];
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

// Mock mongoose Types.ObjectId
if (!mongoose.Types.ObjectId.isValid) {
  mongoose.Types.ObjectId.isValid = jest.fn().mockReturnValue(true);
}

// Mock mongoose model methods
const createMockModel = (collection) => {
  return {
    find: jest.fn().mockImplementation((query = {}) => {
      let results = [...mockDb[collection]];

      // Apply query filters if provided
      if (query.roomCode) {
        results = results.filter(item => item.roomCode === query.roomCode);
      }

      return {
        populate: jest.fn().mockImplementation((field, select) => {
          // Handle population for specific fields
          if (field === 'sender' && select === 'username user_photo') {
            results = results.map(item => {
              if (item.sender) {
                const sender = mockDb.users.find(user =>
                  user._id.toString() === item.sender.toString()
                );
                return {
                  ...item,
                  sender: sender ? {
                    _id: sender._id,
                    username: sender.username,
                    user_photo: sender.user_photo
                  } : item.sender
                };
              }
              return item;
            });
          }
          return {
            sort: jest.fn().mockImplementation(() => {
              return {
                exec: jest.fn().mockResolvedValue(results)
              };
            }),
            exec: jest.fn().mockResolvedValue(results)
          };
        }),
        sort: jest.fn().mockImplementation(() => {
          return {
            exec: jest.fn().mockResolvedValue(results)
          };
        }),
        exec: jest.fn().mockResolvedValue(results)
      };
    }),
    findOne: jest.fn().mockImplementation((query = {}) => {
      let result = mockDb[collection][0] || null;

      // Apply query filters if provided
      if (query._id) {
        result = mockDb[collection].find(item =>
          item._id.toString() === query._id.toString()
        );
      }

      return {
        populate: jest.fn().mockImplementation((field, select) => {
          return {
            exec: jest.fn().mockResolvedValue(result)
          };
        }),
        exec: jest.fn().mockResolvedValue(result)
      };
    }),
    findById: jest.fn().mockImplementation((id) => {
      const item = mockDb[collection].find(item =>
        item._id.toString() === id.toString()
      );
      return {
        populate: jest.fn().mockImplementation((field, select) => {
          return {
            exec: jest.fn().mockResolvedValue(item)
          };
        }),
        exec: jest.fn().mockResolvedValue(item)
      };
    }),
    create: jest.fn().mockImplementation((data) => {
      const newItem = { ...data, _id: new mongoose.Types.ObjectId() };
      mockDb[collection].push(newItem);
      return Promise.resolve(newItem);
    }),
    deleteMany: jest.fn().mockImplementation(() => {
      const count = mockDb[collection].length;
      mockDb[collection] = [];
      return Promise.resolve({ deletedCount: count });
    }),
    save: jest.fn().mockImplementation(function() {
      if (this._id) {
        const index = mockDb[collection].findIndex(item =>
          item._id.toString() === this._id.toString()
        );
        if (index !== -1) {
          mockDb[collection][index] = this;
        } else {
          mockDb[collection].push(this);
        }
      } else {
        this._id = new mongoose.Types.ObjectId();
        mockDb[collection].push(this);
      }
      return Promise.resolve(this);
    }),
    updateOne: jest.fn().mockImplementation((query, update) => {
      return Promise.resolve({ nModified: 1 });
    }),
    findByIdAndDelete: jest.fn().mockImplementation((id) => {
      const index = mockDb[collection].findIndex(item =>
        item._id.toString() === id.toString()
      );
      if (index !== -1) {
        mockDb[collection].splice(index, 1);
      }
      return Promise.resolve(true);
    }),
    findByIdAndUpdate: jest.fn().mockImplementation((id, update) => {
      const index = mockDb[collection].findIndex(item =>
        item._id.toString() === id.toString()
      );
      if (index !== -1) {
        mockDb[collection][index] = { ...mockDb[collection][index], ...update };
      }
      return Promise.resolve(mockDb[collection][index] || null);
    }),
    // Add aggregate method for Chat model
    aggregate: jest.fn().mockImplementation((pipeline) => {
      if (collection === 'chats') {
        // Simple implementation for the getAllchat aggregation
        const roomCodes = [...new Set(mockDb.chats.map(chat => chat.roomCode))];

        return Promise.resolve(
          roomCodes.map(roomCode => {
            const roomMessages = mockDb.chats.filter(chat => chat.roomCode === roomCode);
            const participantIds = [...new Set(roomMessages.map(msg => msg.sender.toString()))];
            const participants = participantIds.map(id => {
              const user = mockDb.users.find(user => user._id.toString() === id);
              return user ? {
                _id: user._id,
                username: user.username,
                user_photo: user.user_photo
              } : { _id: id, username: 'Unknown', user_photo: null };
            });

            return {
              roomCode,
              messages: roomMessages,
              participants
            };
          })
        );
      }
      return Promise.resolve([]);
    })
  };
};

// Create mock models for each collection
const userModel = createMockModel('users');
const chatModel = createMockModel('chats');
const appointmentModel = createMockModel('appointments');
const notificationModel = createMockModel('notifications');

// Override mongoose.model to return our mock models
const originalModel = mongoose.model;
mongoose.model = jest.fn().mockImplementation((name) => {
  switch (name.toLowerCase()) {
    case 'user':
      return userModel;
    case 'chat':
      return chatModel;
    case 'appointment':
      return appointmentModel;
    case 'notification':
      return notificationModel;
    default:
      return createMockModel(name.toLowerCase() + 's');
  }
});

// Export the mock
module.exports = {
  MongoMemoryServer: MockMongoMemoryServer,
  mockDb
};
