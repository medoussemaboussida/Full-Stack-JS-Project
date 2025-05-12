const mongoose = require('mongoose');

// In-memory data store for our mock database
const mockDb = {
  users: [],
  chats: [],
  appointments: [],
  notifications: [],
  publications: [],
  commentaires: [],
  reportPublications: [],
  commentReports: [],
  activities: [],
  categories: [],
  schedules: [],
  moods: [],
  forums: [],
  forumComments: [],
  forumReports: [],
  forumBans: [],
  complaints: [],
  complaintResponses: [],
  associations: [],
  events: [], // Added events collection
  locationCaches: [], // Added locationCaches for geocoding
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
    mockDb.publications = [];
    mockDb.commentaires = [];
    mockDb.reportPublications = [];
    mockDb.commentReports = [];
    mockDb.activities = [];
    mockDb.categories = [];
    mockDb.schedules = [];
    mockDb.moods = [];
    mockDb.forums = [];
    mockDb.forumComments = [];
    mockDb.forumReports = [];
    mockDb.forumBans = [];
    mockDb.complaints = [];
    mockDb.complaintResponses = [];
    mockDb.associations = [];
    mockDb.events = []; // Clear events
    mockDb.locationCaches = []; // Clear locationCaches
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
  const createQueryChain = (results) => ({
    populate: jest.fn().mockImplementation((field, select) => {
      let updatedResults = Array.isArray(results) ? [...results] : results ? { ...results } : null;
      if (field === 'sender' && select === 'username user_photo') {
        updatedResults = updatedResults.map(item => {
          if (item.sender) {
            const sender = mockDb.users.find(user => user._id.toString() === item.sender.toString());
            return {
              ...item,
              sender: sender ? { _id: sender._id, username: sender.username, user_photo: sender.user_photo } : item.sender
            };
          }
          return item;
        });
      } else if (field === 'student' || field === 'psychiatrist') {
        updatedResults = updatedResults.map(item => {
          if (item[field]) {
            const user = mockDb.users.find(user => user._id.toString() === item[field].toString());
            return {
              ...item,
              [field]: user ? { _id: user._id, username: user.username, email: user.email } : item[field]
            };
          }
          return item;
        });
      } else if (field === 'created_by') {
        if (Array.isArray(updatedResults)) {
          updatedResults = updatedResults.map(item => {
            if (item.created_by) {
              const user = mockDb.users.find(user => user._id.toString() === item.created_by.toString());
              return {
                ...item,
                created_by: user ? { _id: user._id, username: user.username, email: user.email } : item.created_by
              };
            }
            return item;
          });
        } else if (updatedResults && updatedResults.created_by) {
          const user = mockDb.users.find(user => user._id.toString() === updatedResults.created_by.toString());
          updatedResults.created_by = user ? { _id: user._id, username: user.username, email: user.email } : updatedResults.created_by;
        }
      } else if (field === 'participants') {
        if (Array.isArray(updatedResults)) {
          updatedResults = updatedResults.map(item => {
            if (item.participants) {
              const participants = item.participants.map(participantId => {
                const user = mockDb.users.find(user => user._id.toString() === participantId.toString());
                return user ? { _id: user._id, username: user.username } : { _id: participantId };
              });
              return { ...item, participants };
            }
            return item;
          });
        } else if (updatedResults && updatedResults.participants) {
          const participants = updatedResults.participants.map(participantId => {
            const user = mockDb.users.find(user => user._id.toString() === participantId.toString());
            return user ? { _id: user._id, username: user.username } : { _id: participantId };
          });
          updatedResults.participants = participants;
        }
      }
      return createQueryChain(updatedResults);
    }),
    select: jest.fn().mockImplementation(() => createQueryChain(results)),
    sort: jest.fn().mockImplementation(() => createQueryChain(results)),
    lean: jest.fn().mockImplementation(() => Promise.resolve(
      Array.isArray(results)
        ? results.map(item => ({
            ...item,
            _id: item._id.toString(),
            created_by: item.created_by ? item.created_by.toString() : item.created_by,
            participants: item.participants ? item.participants.map(p => p.toString()) : [],
          }))
        : results
        ? {
            ...results,
            _id: results._id.toString(),
            created_by: results.created_by ? results.created_by.toString() : results.created_by,
            participants: results.participants ? results.participants.map(p => p.toString()) : [],
          }
        : null
    )),
    exec: jest.fn().mockResolvedValue(results)
  });

  return {
    find: jest.fn().mockImplementation((query = {}) => {
      let results = [...mockDb[collection]];
      if (query.$and) {
        const andConditions = query.$and;
        results = results.filter(item => {
          return andConditions.every(condition => {
            if (condition.isApproved !== undefined) {
              return item.isApproved === condition.isApproved;
            }
            if (condition.$or) {
              return condition.$or.some(orCondition => {
                if (orCondition.status) {
                  return orCondition.status.$in.includes(item.status);
                }
                if (orCondition.end_date) {
                  return new Date(item.end_date) >= orCondition.end_date.$gte;
                }
                return false;
              });
            }
            return true;
          });
        });
      }
      return createQueryChain(results);
    }),
    findOne: jest.fn().mockImplementation((query = {}) => {
      let result = null;
      if (query._id) {
        result = mockDb[collection].find(item => item._id.toString() === query._id.toString());
      } else {
        result = mockDb[collection][0] || null;
      }
      return createQueryChain(result ? [result] : []);
    }),
    findById: jest.fn().mockImplementation((id) => {
      const item = mockDb[collection].find(item => item._id.toString() === id.toString());
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
        const index = mockDb[collection].findIndex(item => item._id.toString() === this._id.toString());
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
      const index = mockDb[collection].findIndex(item => item._id.toString() === query._id.toString());
      if (index !== -1) {
        mockDb[collection][index] = { ...mockDb[collection][index], ...update.$set };
        return Promise.resolve({ modifiedCount: 1 });
      }
      return Promise.resolve({ modifiedCount: 0 });
    }),
    updateMany: jest.fn().mockImplementation((query, update) => {
      let modifiedCount = 0;
      mockDb[collection].forEach((item, index) => {
        if (item.association_id && item.association_id.toString() === query.association_id.toString()) {
          if (update.$unset && update.$unset.association_id) {
            delete mockDb[collection][index].association_id;
          }
          modifiedCount++;
        }
      });
      return Promise.resolve({ modifiedCount });
    }),
    findByIdAndDelete: jest.fn().mockImplementation((id) => {
      const index = mockDb[collection].findIndex(item => item._id.toString() === id.toString());
      if (index !== -1) {
        mockDb[collection].splice(index, 1);
        return Promise.resolve(true);
      }
      return Promise.resolve(null);
    }),
    findByIdAndUpdate: jest.fn().mockImplementation((id, update) => {
      const index = mockDb[collection].findIndex(item => item._id.toString() === id.toString());
      if (index !== -1) {
        mockDb[collection][index] = { ...mockDb[collection][index], ...update };
        return Promise.resolve(mockDb[collection][index]);
      }
      return Promise.resolve(null);
    }),
    aggregate: jest.fn().mockImplementation(() => {
      if (collection === 'chats') {
        const roomCodes = [...new Set(mockDb.chats.map(chat => chat.roomCode))];
        return Promise.resolve(
          roomCodes.map(roomCode => {
            const roomMessages = mockDb.chats.filter(chat => chat.roomCode === roomCode);
            const participantIds = [...new Set(roomMessages.map(msg => msg.sender.toString()))];
            const participants = participantIds.map(id => {
              const user = mockDb.users.find(user => user._id.toString() === id);
              return user ? { _id: user._id, username: user.username, user_photo: user.user_photo } : { _id: id, username: 'Unknown', user_photo: null };
            });
            return { roomCode, messages: roomMessages, participants };
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
const associationModel = createMockModel('associations');
const eventModel = createMockModel('events');
const locationCacheModel = createMockModel('locationCaches');

// Create constructor functions for models
function createModelConstructor(modelName, mockModel) {
  const ModelConstructor = function(data) {
    if (!(this instanceof ModelConstructor)) {
      return new ModelConstructor(data);
    }

    Object.assign(this, data);

    if (!this._id) {
      this._id = new mongoose.Types.ObjectId();
    }

    this.save = jest.fn().mockImplementation(async function(options = {}) {
      const collection = modelName.toLowerCase() + 's';
      const existingIndex = mockDb[collection].findIndex(item => item._id && this._id && item._id.toString() === this._id.toString());
      if (existingIndex !== -1) {
        mockDb[collection][existingIndex] = this;
      } else {
        mockDb[collection].push(this);
      }
      return this;
    });

    this.populate = jest.fn().mockImplementation(async function(field, select) {
      if (field === 'created_by' && select.includes('username')) {
        const user = mockDb.users.find(user => user._id.toString() === this.created_by.toString());
        this.created_by = user ? { _id: user._id, username: user.username, email: user.email } : this.created_by;
      }
      if (field === 'participants' && select.includes('username')) {
        this.participants = this.participants.map(participantId => {
          const user = mockDb.users.find(user => user._id.toString() === participantId.toString());
          return user ? { _id: user._id, username: user.username } : { _id: participantId };
        });
      }
      return this;
    });
  };

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
const Association = createModelConstructor('association', associationModel);
const Event = createModelConstructor('event', eventModel);
const LocationCache = createModelConstructor('locationCache', locationCacheModel);

// Override mongoose.model to return our mock models
mongoose.model = jest.fn().mockImplementation((name) => {
  switch (name.toLowerCase()) {
    case 'user': return User;
    case 'chat': return Chat;
    case 'appointment': return Appointment;
    case 'notification': return Notification;
    case 'publication': return Publication;
    case 'commentaire': return Commentaire;
    case 'reportpublication': return ReportPublication;
    case 'commentreport': return CommentReport;
    case 'activity': return Activity;
    case 'category': return Category;
    case 'schedule': return Schedule;
    case 'mood': return Mood;
    case 'forum': return Forum;
    case 'forumcomment': return ForumComment;
    case 'report': return Report;
    case 'forumban': return ForumBan;
    case 'complaint': return Complaint;
    case 'complaintresponse': return ComplaintResponse;
    case 'association': return Association;
    case 'event': return Event;
    case 'locationcache': return LocationCache;
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
  ComplaintResponse,
  Association,
  Event,
  LocationCache
};