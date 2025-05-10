// Mock MongoDB Memory Server for environments where it can't be installed
const mongoose = require('mongoose');
const event = require('../model/event');

// In-memory data store for our mock database
const mockDb = {
users: [],
  events: [],
  associations: [],
  tickets: [],
  locationCaches: [],
  chats: [],
  appointments: [],
  notifications: [],
  publications: [], // Ajout du tableau pour les publications
  commentaires: [], // Ajout du tableau pour les commentaires
  reportPublications: [], // Ajout du tableau pour les signalements de publications
  commentReports: [], // Ajout du tableau pour les signalements de commentaires
  activities: [], // Ajout du tableau pour les activités
  categories: [], // Ajout du tableau pour les catégories
  schedules: [], // Ajout du tableau pour les plannings
  moods: [], // Ajout du tableau pour les humeurs
  forums: [], // Ajout du tableau pour les forums
  forumComments: [], // Ajout du tableau pour les commentaires de forum
  forumReports: [], // Ajout du tableau pour les signalements de forum
  forumBans: [], // Ajout du tableau pour les bannissements de forum
  complaints: [], // Ajout du tableau pour les réclamations
  complaintResponses: [] // Ajout du tableau pour les réponses aux réclamations
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
    mockDb.events = [];
    mockDb.associations = [];
    mockDb.publications = []; // Vider aussi les publications
    mockDb.commentaires = []; // Vider aussi les commentaires
    mockDb.reportPublications = []; // Vider aussi les signalements de publications
    mockDb.commentReports = []; // Vider aussi les signalements de commentaires
    mockDb.activities = []; // Vider aussi les activités
    mockDb.categories = []; // Vider aussi les catégories
    mockDb.schedules = []; // Vider aussi les plannings
    mockDb.moods = []; // Vider aussi les humeurs
    mockDb.forums = []; // Vider aussi les forums
    mockDb.forumComments = []; // Vider aussi les commentaires de forum
    mockDb.forumReports = []; // Vider aussi les signalements de forum
    mockDb.forumBans = []; // Vider aussi les bannissements de forum
    mockDb.complaints = []; // Vider aussi les réclamations
    mockDb.complaintResponses = []; // Vider aussi les réponses aux réclamations
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
  // Helper function to create chainable query methods
  const createQueryChain = (results) => {
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
        } else if (field === 'student' || field === 'psychiatrist') {
          // Handle population for appointments
          results = results.map(item => {
            if (item[field]) {
              const user = mockDb.users.find(user =>
                user._id.toString() === item[field].toString()
              );
              return {
                ...item,
                [field]: user ? {
                  _id: user._id,
                  username: user.username,
                  email: user.email
                } : item[field]
              };
            }
            return item;
          });
        }
        return createQueryChain(results);
      }),
      sort: jest.fn().mockImplementation(() => createQueryChain(results)),
      lean: jest.fn().mockImplementation(() => createQueryChain(results)),
      exec: jest.fn().mockResolvedValue(results)
    };
  };

  return {
    find: jest.fn().mockImplementation((query = {}) => {
      let results = [...mockDb[collection]];

      // Apply query filters if provided
      if (query.roomCode) {
        results = results.filter(item => item.roomCode === query.roomCode);
      }
      if (query.psychiatrist) {
        results = results.filter(item =>
          item.psychiatrist && item.psychiatrist.toString() === query.psychiatrist.toString()
        );
      }

      return createQueryChain(results);
    }),
    findOne: jest.fn().mockImplementation((query = {}) => {
      let result = null;

      // Apply query filters
      if (query._id) {
        result = mockDb[collection].find(item =>
          item._id.toString() === query._id.toString()
        );
      } else {
        result = mockDb[collection][0] || null;
      }

      return createQueryChain(result ? [result] : []);
    }),
    findById: jest.fn().mockImplementation((id) => {
      const item = mockDb[collection].find(item =>
        item._id.toString() === id.toString()
      );
      return createQueryChain(item ? [item] : []);
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
    updateOne: jest.fn().mockImplementation(() => {
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
    aggregate: jest.fn().mockImplementation(() => {
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

// Create constructor functions for models
function createModelConstructor(modelName, mockModel) {
  const ModelConstructor = function(data) {
    if (!(this instanceof ModelConstructor)) {
      return new ModelConstructor(data);
    }

    // Copy all properties from data to this instance
    Object.assign(this, data);

    // Add _id if not present
    if (!this._id) {
      this._id = new mongoose.Types.ObjectId();
    }

    // Add save method to instance
    this.save = function() {
      // Add this instance to the mock database
      const collection = modelName.toLowerCase() + 's';
      const existingIndex = mockDb[collection].findIndex(item =>
        item._id && this._id && item._id.toString() === this._id.toString()
      );

      if (existingIndex !== -1) {
        mockDb[collection][existingIndex] = this;
      } else {
        mockDb[collection].push(this);
      }

      return Promise.resolve(this);
    };

    // Add other instance methods as needed
    this.populate = function() {
      return Promise.resolve(this);
    };
  };

  // Add static methods from the mock model
  Object.assign(ModelConstructor, mockModel);

  return ModelConstructor;
}

// Create model constructors
const User = createModelConstructor('user', userModel);
const Chat = createModelConstructor('chat', chatModel);
const Appointment = createModelConstructor('appointment', appointmentModel);
const Notification = createModelConstructor('notification', notificationModel);
const Publication = createModelConstructor('publication', createMockModel('publications'));
const Commentaire = createModelConstructor('commentaire', createMockModel('commentaires'));
const ReportPublication = createModelConstructor('reportPublication', createMockModel('reportPublications'));
const CommentReport = createModelConstructor('commentReport', createMockModel('commentReports'));
const Activity = createModelConstructor('activity', createMockModel('activities'));
const Category = createModelConstructor('category', createMockModel('categories'));
const Schedule = createModelConstructor('schedule', createMockModel('schedules'));
const Mood = createModelConstructor('mood', createMockModel('moods'));
const Forum = createModelConstructor('forum', createMockModel('forums'));
const ForumComment = createModelConstructor('forumComment', createMockModel('forumComments'));
const Report = createModelConstructor('report', createMockModel('forumReports'));
const ForumBan = createModelConstructor('forumBan', createMockModel('forumBans'));
const Complaint = createModelConstructor('complaint', createMockModel('complaints'));
const ComplaintResponse = createModelConstructor('complaintResponse', createMockModel('complaintResponses'));
const Event = createModelConstructor('event', createMockModel('events'));
// Override mongoose.model to return our mock models
mongoose.model = jest.fn().mockImplementation((name) => {
  switch (name.toLowerCase()) {
    case 'user':
      return User;
    case 'chat':
      return Chat;
    case 'appointment':
      return Appointment;
    case 'notification':
      return Notification;
    case 'publication':
      return Publication;
    case 'commentaire':
      return Commentaire;
    case 'reportpublication':
      return ReportPublication;
    case 'commentreport':
      return CommentReport;
    case 'activity':
      return Activity;
    case 'category':
      return Category;
    case 'schedule':
      return Schedule;
    case 'mood':
      return Mood;
    case 'forum':
      return Forum;
    case 'forumcomment':
      return ForumComment;
    case 'report':
      return Report;
    case 'forumban':
      return ForumBan;
    case 'complaint':
      return Complaint;
    case 'complaintresponse':
      return ComplaintResponse;
      case 'event':
      return Event;
    default:
      const mockModel = createMockModel(name.toLowerCase() + 's');
      return createModelConstructor(name, mockModel);
  }
});

// Export the mock
module.exports = {
  MongoMemoryServer: MockMongoMemoryServer,
  mockDb,
  User,
  Chat,
  event,
  Appointment,
  Notification,
  Publication,
  Commentaire,
  ReportPublication,
  CommentReport,
  Activity,
  Category,
  Schedule,
  Mood,
  Forum,
  ForumComment,
  Report,
  ForumBan,
  Complaint,
  ComplaintResponse
};
