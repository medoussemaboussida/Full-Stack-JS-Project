const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { addEvent, getEvents, getEventById, updateEvent, deleteEvent } = require('../controller/eventController');

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
      req.file = req.file || { filename: 'mock-image.jpg' }; // Simule un fichier uploadé
      callback(null);
    }),
  });
  multerMock.diskStorage = jest.fn();
  return multerMock;
});

// Mock sendEmail
jest.mock('../utils/emailSender', () => jest.fn().mockResolvedValue(true));

describe('Event Controller', () => {
  let mockDb;
  let User;
  let Event;
  let Ticket;
  let Story;
  let Reply;
  let LocationCache;
  let Notification;

  beforeEach(() => {
    // Récupérer les mocks depuis mockMongoDb
    const mockModels = require('./mockMongoDb');
    mockDb = mockModels.mockDb;
    User = mockModels.User;
    Event = mongoose.model('Event');
    Ticket = mongoose.model('Ticket');
    Story = mongoose.model('Story');
    Reply = mongoose.model('Reply');
    LocationCache = mongoose.model('LocationCache');
    Notification = mockModels.Notification;

    // Réinitialiser les collections avant chaque test
    mockDb.users = [];
    mockDb.events = [];
    mockDb.tickets = [];
    mockDb.stories = [];
    mockDb.replies = [];
    mockDb.locationCaches = [];
    mockDb.notifications = [];

    // Réinitialiser tous les mocks
    jest.clearAllMocks();
  });

  // Tests pour addEvent
  describe('addEvent', () => {
    it('should add a new event successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      };
      mockDb.users.push(user);

      const req = {
        userId: userId.toString(),
        body: {
          title: 'Test Event',
          description: 'This is a test event',
          start_date: '2025-05-15',
          end_date: '2025-05-16',
          heure: '14:00',
          contact_email: 'contact@example.com',
          event_type: 'in-person',
          localisation: 'Paris',
          lieu: 'Venue',
          max_participants: '50',
          hasPartners: 'false',
        },
        file: { filename: 'test-image.jpg' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Mock axios pour le géocodage
      axios.get.mockResolvedValue({
        data: {
          status: 'OK',
          results: [{ geometry: { location: { lat: 48.8566, lng: 2.3522 } } }],
        },
      });

      await addEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Event added successfully',
          data: expect.objectContaining({
            title: 'Test Event',
            created_by: userId.toString(),
            imageUrl: '/Uploads/test-image.jpg',
            coordinates: { lat: 48.8566, lng: 2.3522 },
          }),
        })
      );
      expect(mockDb.events.length).toBe(1);
      expect(mockDb.events[0].title).toBe('Test Event');
      expect(mockDb.events[0].created_by.toString()).toBe(userId.toString());
      expect(mockDb.events[0].imageUrl).toBe('/Uploads/test-image.jpg');
      expect(mockDb.events[0].coordinates).toEqual({ lat: 48.8566, lng: 2.3522 });
    });

    it('should return 403 if user is not an association member', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'student', // Rôle non autorisé
      };
      mockDb.users.push(user);

      const req = {
        userId: userId.toString(),
        body: {
          title: 'Test Event',
          description: 'This is a test event',
          start_date: '2025-05-15',
          end_date: '2025-05-16',
          heure: '14:00',
          contact_email: 'contact@example.com',
          event_type: 'in-person',
          localisation: 'Paris',
          lieu: 'Venue',
        },
        file: null,
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await addEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Only association members can create events',
      });
      expect(mockDb.events.length).toBe(0);
    });

    it('should return 400 if required fields are missing', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      };
      mockDb.users.push(user);

      const req = {
        userId: userId.toString(),
        body: {
          description: 'This is a test event',
          start_date: '2025-05-15',
          end_date: '2025-05-16',
          heure: '14:00',
          // Manque title et contact_email
          event_type: 'in-person',
          localisation: 'Paris',
          lieu: 'Venue',
        },
        file: null,
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await addEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing or invalid required fields: title, contact_email',
      });
      expect(mockDb.events.length).toBe(0);
    });
  });

  // Tests pour getEvents
  describe('getEvents', () => {
    it('should return all approved events', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
      };
      mockDb.users.push(user);

      const events = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Event 1',
          description: 'Description 1',
          start_date: new Date('2025-05-20'),
          end_date: new Date('2025-05-21'),
          created_by: userId,
          isApproved: true,
          status: 'upcoming',
          participants: [],
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Event 2',
          description: 'Description 2',
          start_date: new Date('2025-05-22'),
          end_date: new Date('2025-05-23'),
          created_by: userId,
          isApproved: false, // Non approuvé
          status: 'upcoming',
          participants: [],
        },
      ];
      mockDb.events.push(...events);

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getEvents(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Event 1',
            isApproved: true,
            created_by: expect.objectContaining({ username: 'testuser' }),
            participants: [],
          }),
        ])
      );
      expect(res.json.mock.calls[0][0].length).toBe(1); // Seulement l'événement approuvé
    });
  });

  // Tests pour getEventById
  describe('getEventById', () => {
    it('should return an event by ID', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
      };
      mockDb.users.push(user);

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        title: 'Test Event',
        description: 'Description',
        created_by: userId,
        participants: [],
        isApproved: true,
      };
      mockDb.events.push(event);

      const req = { params: { id: eventId.toString() } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getEventById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Event',
          created_by: expect.objectContaining({ username: 'testuser', email: 'testuser@example.com' }),
          participants: [],
        })
      );
    });

    it('should return 404 if event not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const req = { params: { id: nonExistentId.toString() } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getEventById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
    });

    it('should return 400 if ID is invalid', async () => {
      const req = { params: { id: 'invalid-id' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getEventById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID' });
    });
  });

  // Tests pour updateEvent
  describe('updateEvent', () => {
    it('should update an event successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        role: 'association_member',
      };
      mockDb.users.push(user);

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        title: 'Old Title',
        description: 'Old Description',
        start_date: new Date('2025-05-15'),
        end_date: new Date('2025-05-16'),
        heure: '14:00',
        created_by: userId,
        participants: [],
        event_type: 'in-person',
        localisation: 'Paris',
        lieu: 'Venue',
        contact_email: 'old@example.com',
      };
      mockDb.events.push(event);

      const req = {
        userId: userId.toString(),
        params: { id: eventId.toString() },
        body: {
          title: 'Updated Title',
          description: 'Updated Description',
          start_date: '2025-05-16',
          end_date: '2025-05-17',
          heure: '15:00',
          event_type: 'in-person',
          localisation: 'Paris',
          lieu: 'Venue',
          contact_email: 'new@example.com',
        },
        file: null,
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Event updated successfully',
          data: expect.objectContaining({
            title: 'Updated Title',
            description: 'Updated Description',
            heure: '15:00',
          }),
        })
      );
      expect(mockDb.events[0].title).toBe('Updated Title');
      expect(mockDb.events[0].description).toBe('Updated Description');
      expect(mockDb.events[0].heure).toBe('15:00');
    });

    it('should return 403 if user is not the creator', async () => {
      const userId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        role: 'association_member',
      };
      mockDb.users.push(user);

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        title: 'Test Event',
        created_by: userId,
        start_date: new Date('2025-05-15'),
        end_date: new Date('2025-05-16'),
        heure: '14:00',
        event_type: 'in-person',
        localisation: 'Paris',
        lieu: 'Venue',
        contact_email: 'test@example.com',
      };
      mockDb.events.push(event);

      const req = {
        userId: otherUserId.toString(),
        params: { id: eventId.toString() },
        body: {
          title: 'Updated Title',
          start_date: '2025-05-16',
          end_date: '2025-05-17',
          heure: '15:00',
          event_type: 'in-person',
          localisation: 'Paris',
          lieu: 'Venue',
          contact_email: 'new@example.com',
        },
        file: null,
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await updateEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You are not authorized to update this event',
      });
    });
  });

  // Tests pour deleteEvent
  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        role: 'association_member',
      };
      mockDb.users.push(user);

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        title: 'Test Event',
        created_by: userId,
      };
      mockDb.events.push(event);

      const req = {
        userId: userId.toString(),
        params: { id: eventId.toString() },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event deleted successfully' });
      expect(mockDb.events.length).toBe(0);
    });

    it('should return 403 if user is not the creator', async () => {
      const userId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        role: 'association_member',
      };
      mockDb.users.push(user);

      const eventId = new mongoose.Types.ObjectId();
      const event = {
        _id: eventId,
        title: 'Test Event',
        created_by: userId,
      };
      mockDb.events.push(event);

      const req = {
        userId: otherUserId.toString(),
        params: { id: eventId.toString() },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteEvent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You are not authorized to delete this event',
      });
      expect(mockDb.events.length).toBe(1);
    });
  });
});