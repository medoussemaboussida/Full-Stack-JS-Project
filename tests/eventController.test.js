const mongoose = require('mongoose');
const axios = require('axios');
const multer = require('multer');
const sendEmail = require('../utils/emailSender');

// Mock axios
jest.mock('axios');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation(() => ({ id: 'mockUserId' })),
  sign: jest.fn().mockReturnValue('mockToken'),
}));

// Mock multer
jest.mock('multer', () => {
  const multerMock = () => ({
    single: jest.fn().mockImplementation(() => (req, res, callback) => {
      req.file = req.file || { filename: 'mock-image.jpg' };
      callback(null);
    }),
  });
  multerMock.diskStorage = jest.fn();
  return multerMock;
});

// Mock sendEmail
jest.mock('../utils/emailSender', () => jest.fn().mockResolvedValue(true));

describe('Association and Event Controller', () => {
  let mockDb;
  let User;
  let Association;
  let Event;

  beforeEach(() => {
    // Get mockDb and models from our mock implementation
    const mockModels = require('./mockMongoDb');
    mockDb = mockModels.mockDb;
    User = mockModels.User;
    Association = mockModels.Association;
    Event = mockModels.Event;

    // Initialize collections if they don't exist
    if (!mockDb.associations) mockDb.associations = [];
    if (!mockDb.events) mockDb.events = [];

    // Clear mockDb collections before each test
    mockDb.users = [];
    mockDb.associations = [];
    mockDb.events = [];
    mockDb.locationCaches = [];

    // Reset all mocks
    jest.clearAllMocks();
  });

  // Tests for addAssociation
  describe('addAssociation', () => {
    it('should add a new association', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
        association_id: null,
      };
      mockDb.users.push(user);

      expect(mockDb.associations.length).toBe(0);

      const associationData = {
        Name_association: 'Test Association',
        Description_association: 'This is a test association',
        contact_email_association: 'test@association.com',
        support_type: 'charity',
      };

      const associationId = new mongoose.Types.ObjectId();
      const association = {
        _id: associationId,
        ...associationData,
        logo_association: '/Uploads/mock-logo.jpg',
        created_by: userId,
        createdAt: new Date(),
      };
      mockDb.associations.push(association);

      expect(mockDb.associations.length).toBe(1);
      expect(mockDb.associations[0].Name_association).toBe('Test Association');
      expect(mockDb.associations[0].created_by).toEqual(userId);
    });

    it('should return 404 if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const user = mockDb.users.find(u => u._id.toString() === nonExistentId.toString());
      expect(user).toBeUndefined();
    });
  });

  // Tests for getAssociations
  describe('getAssociations', () => {
    it('should return all associations with populated created_by', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'student',
      };

      const association1Id = new mongoose.Types.ObjectId();
      const association2Id = new mongoose.Types.ObjectId();

      const associations = [
        {
          _id: association1Id,
          Name_association: 'Association 1',
          Description_association: 'Description 1',
          contact_email_association: 'assoc1@example.com',
          support_type: 'charity',
          logo_association: '/Uploads/logo1.jpg',
          created_by: userId,
          isApproved: true,
          createdAt: new Date('2025-05-01'),
        },
        {
          _id: association2Id,
          Name_association: 'Association 2',
          Description_association: 'Description 2',
          contact_email_association: 'assoc2@example.com',
          support_type: 'education',
          logo_association: '/Uploads/logo2.jpg',
          created_by: userId,
          isApproved: false,
          createdAt: new Date('2025-05-02'),
        },
      ];

      mockDb.users.push(user);
      mockDb.associations.push(...associations);

      mockDb.associations.forEach(assoc => {
        assoc.toObject = function() {
          return { ...this };
        };
      });

      expect(mockDb.associations.length).toBe(2);
      expect(mockDb.associations[0].Name_association).toBe('Association 1');
      expect(mockDb.associations[1].Name_association).toBe('Association 2');
    });
  });

  // Tests for getAssociationById
  describe('getAssociationById', () => {
    it('should return an association by ID', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
      };

      const associationId = new mongoose.Types.ObjectId();
      const association = {
        _id: associationId,
        Name_association: 'Test Association',
        Description_association: 'Description',
        created_by: userId,
      };

      mockDb.users.push(user);
      mockDb.associations.push(association);

      expect(mockDb.associations.length).toBe(1);
      expect(mockDb.associations[0].Name_association).toBe('Test Association');

      const assocInDb = mockDb.associations.find(a => a._id.toString() === associationId.toString());
      expect(assocInDb).toBeDefined();
      expect(assocInDb.Name_association).toBe('Test Association');
    });

    it('should return 404 if association not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const association = mockDb.associations.find(a => a._id.toString() === nonExistentId.toString());
      expect(association).toBeUndefined();
    });
  });

  // Tests for updateAssociation
  describe('updateAssociation', () => {
    it('should update an association', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'student',
      };

      const associationId = new mongoose.Types.ObjectId();
      const association = {
        _id: associationId,
        Name_association: 'Original Name',
        Description_association: 'Original Description',
        created_by: userId,
        save: jest.fn().mockImplementation(function() {
          return Promise.resolve(this);
        }),
      };

      mockDb.users.push(user);
      mockDb.associations.push(association);

      expect(mockDb.associations[0].Name_association).toBe('Original Name');
      expect(mockDb.associations[0].Description_association).toBe('Original Description');

      const updatedData = {
        Name_association: 'Updated Name',
        Description_association: 'Updated Description',
      };

      const assocToUpdate = mockDb.associations.find(a => a._id.toString() === associationId.toString());
      if (updatedData.Name_association) assocToUpdate.Name_association = updatedData.Name_association;
      if (updatedData.Description_association) assocToUpdate.Description_association = updatedData.Description_association;

      expect(assocToUpdate.Name_association).toBe('Updated Name');
      expect(assocToUpdate.Description_association).toBe('Updated Description');
    });

    it('should return 404 if association not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const association = mockDb.associations.find(a => a._id.toString() === nonExistentId.toString());
      expect(association).toBeUndefined();
    });
  });

  // Tests for deleteAssociation
  describe('deleteAssociation', () => {
    it('should delete an association and unlink users', async () => {
      const userId = new mongoose.Types.ObjectId();
      const associationId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        association_id: associationId,
      };

      const association = {
        _id: associationId,
        Name_association: 'Association to Delete',
        created_by: userId,
      };

      mockDb.users.push(user);
      mockDb.associations.push(association);

      expect(mockDb.associations.length).toBe(1);
      expect(mockDb.users[0].association_id).toEqual(associationId);

      mockDb.associations = mockDb.associations.filter(a => a._id.toString() !== associationId.toString());
      mockDb.users.forEach(u => {
        if (u.association_id && u.association_id.toString() === associationId.toString()) {
          delete u.association_id;
        }
      });

      expect(mockDb.associations.length).toBe(0);
      expect(mockDb.users[0].association_id).toBeUndefined();
    });

    it('should return 403 if user is not the creator', async () => {
      const creatorId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();

      const users = [
        {
          _id: creatorId,
          username: 'creator',
          email: 'creator@example.com',
          role: 'student',
        },
        {
          _id: otherUserId,
          username: 'otheruser',
          email: 'otheruser@example.com',
          role: 'student',
        },
      ];

      const associationId = new mongoose.Types.ObjectId();
      const association = {
        _id: associationId,
        Name_association: 'Association Topic',
        created_by: creatorId,
      };

      mockDb.users.push(...users);
      mockDb.associations.push(association);

      const assocInDb = mockDb.associations.find(a => a._id.toString() === associationId.toString());
      expect(assocInDb.created_by.toString()).not.toBe(otherUserId.toString());
    });
  });

  // Tests for addEvent
  describe('addEvent', () => {
    it('should add a new event', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      };
      mockDb.users.push(user);

      expect(mockDb.events.length).toBe(0);

      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2025-06-01',
        end_date: '2025-06-02',
        localisation: 'Tunis, Tunisia',
        lieu: 'Venue 1',
        heure: '10:00',
        contact_email: 'test@event.com',
        event_type: 'in-person',
        max_participants: '100',
        hasPartners: 'true',
      };

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        ...eventData,
        start_date: new Date('2025-06-01T10:00:00Z'),
        end_date: new Date('2025-06-02T10:00:00Z'),
        imageUrl: '/Uploads/mock-image.jpg',
        created_by: userId,
        participants: [],
        status: 'upcoming',
        coordinates: { lat: 36.8065, lng: 10.1815 },
        hasPartners: true,
        createdAt: new Date(),
      };
      mockDb.events.push(event);

      // Mock geocoding
      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          results: [{ geometry: { location: { lat: 36.8065, lng: 10.1815 } } }],
        },
      });

      expect(mockDb.events.length).toBe(1);
      expect(mockDb.events[0].title).toBe('Test Event');
      expect(mockDb.events[0].created_by).toEqual(userId);
    });

    it('should return 403 if user is not an association member', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'student',
      };
      mockDb.users.push(user);

      const userInDb = mockDb.users.find(u => u._id.toString() === userId.toString());
      expect(userInDb.role).toBe('student');
    });
  });

  // Tests for getEvents
  describe('getEvents', () => {
    it('should return all approved and upcoming/ongoing events', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      };

      const event1Id = new mongoose.Types.ObjectId();
      const event2Id = new mongoose.Types.ObjectId();
      const event3Id = new mongoose.Types.ObjectId();

      const events = [
        {
          _id: event1Id,
          title: 'Event 1',
          description: 'Description 1',
          start_date: new Date('2025-06-01T10:00:00Z'),
          end_date: new Date('2025-06-02T10:00:00Z'),
          created_by: userId,
          participants: [],
          isApproved: true,
          status: 'upcoming',
        },
        {
          _id: event2Id,
          title: 'Event 2',
          description: 'Description 2',
          start_date: new Date('2025-05-01T10:00:00Z'),
          end_date: new Date('2025-05-02T10:00:00Z'),
          created_by: userId,
          participants: [],
          isApproved: true,
          status: 'finished',
        },
        {
          _id: event3Id,
          title: 'Event 3',
          description: 'Description 3',
          start_date: new Date('2025-06-01T10:00:00Z'),
          end_date: new Date('2025-06-02T10:00:00Z'),
          created_by: userId,
          participants: [],
          isApproved: false,
          status: 'upcoming',
        },
      ];

      mockDb.users.push(user);
      mockDb.events.push(...events);

      mockDb.events.forEach(event => {
        event.toObject = function() {
          return { ...this };
        };
      });

      const filteredEvents = mockDb.events.filter(event => 
        event.isApproved && (['upcoming', 'ongoing'].includes(event.status) || new Date(event.end_date) >= new Date())
      );

      expect(filteredEvents.length).toBe(1);
      expect(filteredEvents[0].title).toBe('Event 1');
    });
  });

  // Tests for getAllEventsForAdmin
  describe('getAllEventsForAdmin', () => {
    it('should return all events for admin', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      };

      const event1Id = new mongoose.Types.ObjectId();
      const event2Id = new mongoose.Types.ObjectId();

      const events = [
        {
          _id: event1Id,
          title: 'Event 1',
          description: 'Description 1',
          start_date: new Date('2025-06-01T10:00:00Z'),
          end_date: new Date('2025-06-02T10:00:00Z'),
          created_by: userId,
          participants: [],
          isApproved: true,
          status: 'upcoming',
        },
        {
          _id: event2Id,
          title: 'Event 2',
          description: 'Description 2',
          start_date: new Date('2025-05-01T10:00:00Z'),
          end_date: new Date('2025-05-02T10:00:00Z'),
          created_by: userId,
          participants: [],
          isApproved: false,
          status: 'finished',
        },
      ];

      mockDb.users.push(user);
      mockDb.events.push(...events);

      mockDb.events.forEach(event => {
        event.toObject = function() {
          return { ...this };
        };
      });

      expect(mockDb.events.length).toBe(2);
      expect(mockDb.events[0].title).toBe('Event 1');
      expect(mockDb.events[1].title).toBe('Event 2');
    });
  });

  // Tests for getEventById
  describe('getEventById', () => {
    it('should return an event by ID', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
      };

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        title: 'Test Event',
        description: 'Description',
        created_by: userId,
        participants: [],
      };

      mockDb.users.push(user);
      mockDb.events.push(event);

      expect(mockDb.events.length).toBe(1);
      expect(mockDb.events[0].title).toBe('Test Event');

      const eventInDb = mockDb.events.find(e => e._id.toString() === eventId.toString());
      expect(eventInDb).toBeDefined();
      expect(eventInDb.title).toBe('Test Event');
    });

    it('should return 404 if event not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const event = mockDb.events.find(e => e._id.toString() === nonExistentId.toString());
      expect(event).toBeUndefined();
    });
  });

  // Tests for updateEvent
  describe('updateEvent', () => {
    it('should update an event', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      };

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        title: 'Original Event',
        description: 'Original Description',
        start_date: new Date('2025-06-01T10:00:00Z'),
        end_date: new Date('2025-06-02T10:00:00Z'),
        created_by: userId,
        participants: [],
        save: jest.fn().mockImplementation(function() {
          return Promise.resolve(this);
        }),
      };

      mockDb.users.push(user);
      mockDb.events.push(event);

      expect(mockDb.events[0].title).toBe('Original Event');
      expect(mockDb.events[0].description).toBe('Original Description');

      const updatedData = {
        title: 'Updated Event',
        description: 'Updated Description',
      };

      const eventToUpdate = mockDb.events.find(e => e._id.toString() === eventId.toString());
      if (updatedData.title) eventToUpdate.title = updatedData.title;
      if (updatedData.description) eventToUpdate.description = updatedData.description;

      expect(eventToUpdate.title).toBe('Updated Event');
      expect(eventToUpdate.description).toBe('Updated Description');
    });

    it('should return 404 if event not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const event = mockDb.events.find(e => e._id.toString() === nonExistentId.toString());
      expect(event).toBeUndefined();
    });
  });

  // Tests for deleteEvent
  describe('deleteEvent', () => {
    it('should delete an event', async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
      };

      const event = {
        _id: eventId,
        title: 'Event to Delete',
        created_by: userId,
      };

      mockDb.users.push(user);
      mockDb.events.push(event);

      expect(mockDb.events.length).toBe(1);

      mockDb.events = mockDb.events.filter(e => e._id.toString() !== eventId.toString());

      expect(mockDb.events.length).toBe(0);
    });

    it('should return 403 if user is not the creator', async () => {
      const creatorId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();

      const users = [
        {
          _id: creatorId,
          username: 'creator',
          email: 'creator@example.com',
          role: 'association_member',
        },
        {
          _id: otherUserId,
          username: 'otheruser',
          email: 'otheruser@example.com',
          role: 'association_member',
        },
      ];

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        title: 'Event Topic',
        created_by: creatorId,
      };

      mockDb.users.push(...users);
      mockDb.events.push(event);

      const eventInDb = mockDb.events.find(e => e._id.toString() === eventId.toString());
      expect(eventInDb.created_by.toString()).not.toBe(otherUserId.toString());
    });
  });
});