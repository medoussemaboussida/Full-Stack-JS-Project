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
  events: [],
  tickets: [],
  stories: [],
  replies: [],
  locationCaches: [],
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
    mockDb.events = [];
    mockDb.tickets = [];
    mockDb.stories = [];
    mockDb.replies = [];
    mockDb.locationCaches = [];
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
    db: { databaseName: 'test-db' }
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
    populate: jest.fn().mockImplementation(function(field, select) {
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
      } else if (field === 'created_by' || field === 'participants') {
        if (Array.isArray(updatedResults)) {
          updatedResults = updatedResults.map(item => {
            if (item[field]) {
              if (field === 'participants') {
                const participants = Array.isArray(item[field])
                  ? item[field].map(participantId => {
                      const user = mockDb.users.find(user => user._id.toString() === participantId.toString());
                      return user ? { _id: user._id, username: user.username, email: user.email } : null;
                    }).filter(Boolean)
                  : [];
                return { ...item, participants };
              } else {
                const user = mockDb.users.find(user => user._id.toString() === item[field].toString());
                return {
                  ...item,
                  [field]: user ? { _id: user._id, username: user.username, email: user.email, imageUrl: user.imageUrl || null } : item[field]
                };
              }
            }
            return item;
          });
        } else if (updatedResults) {
          if (field === 'participants') {
            const participants = Array.isArray(updatedResults[field])
              ? updatedResults[field].map(participantId => {
                  const user = mockDb.users.find(user => user._id.toString() === participantId.toString());
                  return user ? { _id: user._id, username: user.username, email: user.email } : null;
                }).filter(Boolean)
              : [];
            updatedResults = { ...updatedResults, participants };
          } else {
            const user = mockDb.users.find(user => user._id.toString() === updatedResults[field].toString());
            updatedResults = {
              ...updatedResults,
              [field]: user ? { _id: user._id, username: user.username, email: user.email, imageUrl: user.imageUrl || null } : updatedResults[field]
            };
          }
        }
      }
      return createQueryChain(updatedResults);
    }),
    sort: jest.fn().mockImplementation((sortObj) => {
      if (sortObj.start_date && Array.isArray(results)) {
        results.sort((a, b) => {
          const dateA = new Date(a.start_date);
          const dateB = new Date(b.start_date);
          return sortObj.start_date === 1 ? dateA - dateB : dateB - dateA;
        });
      }
      return createQueryChain(results);
    }),
    lean: jest.fn().mockImplementation(() => {
      const leanResults = Array.isArray(results)
        ? results.map(item => ({
            ...item,
            _id: item._id.toString(),
            created_by: item.created_by ? item.created_by.toString() : item.created_by,
            participants: item.participants ? item.participants.map(id => id.toString()) : item.participants,
          }))
        : results
        ? {
            ...results,
            _id: results._id.toString(),
            created_by: results.created_by ? results.created_by.toString() : results.created_by,
            participants: results.participants ? results.participants.map(id => id.toString()) : results.participants,
          }
        : null;
      return Promise.resolve(leanResults);
    }),
    exec: jest.fn().mockImplementation(() => Promise.resolve(results))
  });

  return {
    find: jest.fn().mockImplementation((query = {}) => {
      let results = [...mockDb[collection]];
      if (query.$and) {
        query.$and.forEach(condition => {
          if (condition.isApproved) {
            results = results.filter(item => item.isApproved === condition.isApproved);
          }
          if (condition.$or) {
            const orResults = [];
            condition.$or.forEach(orCondition => {
              if (orCondition.status) {
                const statuses = orCondition.status.$in || [];
                results.forEach(item => {
                  if (statuses.includes(item.status) && !orResults.includes(item)) {
                    orResults.push(item);
                  }
                });
              }
              if (orCondition.end_date) {
                const currentDate = new Date();
                results.forEach(item => {
                  const endDate = new Date(item.end_date);
                  if (orCondition.end_date.$gte && endDate >= currentDate && !orResults.includes(item)) {
                    orResults.push(item);
                  }
                });
              }
            });
            results = orResults;
          }
        });
      } else {
        if (query.roomCode) {
          results = results.filter(item => item.roomCode === query.roomCode);
        }
        if (query.psychiatrist) {
          results = results.filter(item => item.psychiatrist && item.psychiatrist.toString() === query.psychiatrist.toString());
        }
        if (query.isApproved) {
          results = results.filter(item => item.isApproved === query.isApproved);
        }
        if (query.created_by) {
          results = results.filter(item => item.created_by && item.created_by.toString() === query.created_by.toString());
        }
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
      if (!item) {
        return Promise.resolve(null);
      }
      let populatedItem = { ...item };
      if (populatedItem.created_by) {
        const user = mockDb.users.find(user => user._id.toString() === populatedItem.created_by.toString());
        populatedItem.created_by = user ? { _id: user._id, username: user.username, email: user.email, imageUrl: user.imageUrl || null } : populatedItem.created_by;
      }
      if (populatedItem.participants) {
        populatedItem.participants = populatedItem.participants.map(participantId => {
          const user = mockDb.users.find(user => user._id.toString() === participantId.toString());
          return user ? { _id: user._id, username: user.username, email: user.email } : null;
        }).filter(Boolean);
      }
      return Promise.resolve(populatedItem);
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
    updateOne: jest.fn().mockImplementation(() => Promise.resolve({ nModified: 1 })),
    findByIdAndDelete: jest.fn().mockImplementation((id) => {
      const index = mockDb[collection].findIndex(item => item._id.toString() === id.toString());
      if (index !== -1) {
        mockDb[collection].splice(index, 1);
        return Promise.resolve({ deletedCount: 1 });
      }
      return Promise.resolve({ deletedCount: 0 });
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
const eventModel = createMockModel('events');
const ticketModel = createMockModel('tickets');
const storyModel = createMockModel('stories');
const replyModel = createMockModel('replies');
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

    this.save = jest.fn().mockImplementation(async function() {
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
        this.created_by = user ? { _id: user._id, username: user.username, email: user.email, imageUrl: user.imageUrl || null } : this.created_by;
      }
      if (field === 'participants' && select.includes('username')) {
        this.participants = this.participants.map(participantId => {
          const user = mockDb.users.find(user => user._id.toString() === participantId.toString());
          return user ? { _id: user._id, username: user.username, email: user.email } : null;
        }).filter(Boolean);
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
const Event = createModelConstructor('event', eventModel);
const Ticket = createModelConstructor('ticket', ticketModel);
const Story = createModelConstructor('story', storyModel);
const Reply = createModelConstructor('reply', replyModel);
const LocationCache = createModelConstructor('locationCache', locationCacheModel);
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

// Override mongoose.model to return our mock models
mongoose.model = jest.fn().mockImplementation((name) => {
  switch (name.toLowerCase()) {
    case 'user': return User;
    case 'chat': return Chat;
    case 'appointment': return Appointment;
    case 'notification': return Notification;
    case 'event': return Event;
    case 'ticket': return Ticket;
    case 'story': return Story;
    case 'reply': return Reply;
    case 'locationcache': return LocationCache;
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
  Event,
  Ticket,
  Story,
  Reply,
  LocationCache,
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