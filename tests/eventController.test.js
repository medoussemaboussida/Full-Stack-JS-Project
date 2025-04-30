jest.setTimeout(10000);
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const Event = require('../model/event');
const User = require('../model/user');
const eventController = require('../controller/eventController');
const sendEmail = require('../utils/emailSender');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../utils/emailSender');
jest.mock('axios');
jest.mock('multer');

describe('Event Controller', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    app = express();
    app.use(express.json());

    // Define routes to test
    app.post('/event', eventController.addEvent);
    app.get('/events', eventController.getEvents);
    app.get('/event/:id', eventController.getEventById);
    app.post('/event/:id/participate', eventController.participate);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await User.deleteMany({});
    await Event.deleteMany({});
  });

  describe('addEvent', () => {
    it('should create an event successfully', async () => {
      // Create a user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      });
      await user.save();

      // Mock JWT verification
      jwt.verify.mockReturnValue({ id: userId.toString() });

      // Mock multer
      const multerMock = jest.fn((req, res, cb) => cb(null));
      require('multer').mockReturnValue({ single: () => multerMock });

      // Mock axios for geocoding
      require('axios').mockResolvedValue({
        data: {
          status: 'OK',
          results: [{ geometry: { location: { lat: 40.7128, lng: -74.0060 } } }],
        },
      });

      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2025-05-01',
        end_date: '2025-05-02',
        localisation: 'New York',
        lieu: 'Central Park',
        heure: '10:00',
        contact_email: 'contact@example.com',
        event_type: 'in-person',
        max_participants: '100',
        hasPartners: 'true',
      };

      const response = await request(app)
        .post('/event')
        .set('Authorization', `Bearer validtoken`)
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Event added successfully');
      expect(response.body.data.title).toBe('Test Event');
      expect(response.body.data.coordinates).toEqual({ lat: 40.7128, lng: -74.0060 });

      // Verify the event is saved
      const savedEvent = await Event.findOne({ title: 'Test Event' });
      expect(savedEvent).toBeTruthy();
      expect(savedEvent.created_by.toString()).toBe(userId.toString());
    });

    it('should return 403 if user is not an association member', async () => {
      // Create a non-association member user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'user',
      });
      await user.save();

      // Mock JWT verification
      jwt.verify.mockReturnValue({ id: userId.toString() });

      // Mock multer
      const multerMock = jest.fn((req, res, cb) => cb(null));
      require('multer').mockReturnValue({ single: () => multerMock });

      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2025-05-01',
        end_date: '2025-05-02',
        localisation: 'New York',
        lieu: 'Central Park',
        heure: '10:00',
        contact_email: 'contact@example.com',
        event_type: 'in-person',
      };

      const response = await request(app)
        .post('/event')
        .set('Authorization', `Bearer validtoken`)
        .send(eventData);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only association members can create events');
    });

    it('should return 400 for missing required fields', async () => {
      // Create a user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      });
      await user.save();

      // Mock JWT verification
      jwt.verify.mockReturnValue({ id: userId.toString() });

      // Mock multer
      const multerMock = jest.fn((req, res, cb) => cb(null));
      require('multer').mockReturnValue({ single: () => multerMock });

      const eventData = {
        description: 'This is a test event',
        start_date: '2025-05-01',
        end_date: '2025-05-02',
        localisation: 'New York',
        lieu: 'Central Park',
        heure: '10:00',
        event_type: 'in-person',
      };

      const response = await request(app)
        .post('/event')
        .set('Authorization', `Bearer validtoken`)
        .send(eventData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing or invalid required fields: title, contact_email');
    });
  });

  describe('getEvents', () => {
    it('should return approved upcoming events', async () => {
      // Create an approved event
      const event = new Event({
        title: 'Approved Event',
        description: 'Description',
        start_date: new Date('2025-05-01T10:00:00Z'),
        end_date: new Date('2025-05-02T10:00:00Z'),
        created_by: new mongoose.Types.ObjectId(),
        event_type: 'in-person',
        localisation: 'Test Location',
        lieu: 'Test Venue',
        heure: '10:00',
        contact_email: 'contact@example.com',
        isApproved: true,
        status: 'upcoming',
      });
      await event.save();

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].title).toBe('Approved Event');
    });

    it('should not return unapproved events', async () => {
      // Create an unapproved event
      const event = new Event({
        title: 'Unapproved Event',
        description: 'Description',
        start_date: new Date('2025-05-01T10:00:00Z'),
        end_date: new Date('2025-05-02T10:00:00Z'),
        created_by: new mongoose.Types.ObjectId(),
        event_type: 'in-person',
        localisation: 'Test Location',
        lieu: 'Test Venue',
        heure: '10:00',
        contact_email: 'contact@example.com',
        isApproved: false,
      });
      await event.save();

      const response = await request(app).get('/events');

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(0);
    });
  });

  describe('getEventById', () => {
    it('should return event by ID', async () => {
      // Create a user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
      });
      await user.save();

      // Create an event
      const eventId = new mongoose.Types.ObjectId();
      const event = new Event({
        _id: eventId,
        title: 'Test Event',
        description: 'Description',
        start_date: new Date('2025-05-01T10:00:00Z'),
        end_date: new Date('2025-05-02T10:00:00Z'),
        created_by: userId,
        event_type: 'in-person',
        localisation: 'Test Location',
        lieu: 'Test Venue',
        heure: '10:00',
        contact_email: 'contact@example.com',
      });
      await event.save();

      const response = await request(app).get(`/event/${eventId}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Test Event');
      expect(response.body.created_by.username).toBe('testuser');
    });

    it('should return 404 if event not found', async () => {
      const nonExistentEventId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/event/${nonExistentEventId}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Event not found');
    });

    it('should return 400 for invalid event ID', async () => {
      const response = await request(app).get('/event/invalidid');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid ID');
    });
  });

  describe('participate', () => {
    it('should allow user to participate in an event', async () => {
      // Create a user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'user',
      });
      await user.save();

      // Create an event
      const eventId = new mongoose.Types.ObjectId();
      const event = new Event({
        _id: eventId,
        title: 'Test Event',
        description: 'Description',
        start_date: new Date('2025-05-01T10:00:00Z'),
        end_date: new Date('2025-05-02T10:00:00Z'),
        created_by: new mongoose.Types.ObjectId(),
        event_type: 'in-person',
        localisation: 'Test Location',
        lieu: 'Test Venue',
        heure: '10:00',
        contact_email: 'contact@example.com',
        participants: [],
        max_participants: 10,
      });
      await event.save();

      // Mock JWT verification
      jwt.verify.mockReturnValue({ id: userId.toString() });

      const response = await request(app)
        .post(`/event/${eventId}/participate`)
        .set('Authorization', `Bearer validtoken`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('You have successfully joined the event');
      expect(response.body.participantsCount).toBe(1);

      // Verify the user is a participant
      const updatedEvent = await Event.findById(eventId);
      expect(updatedEvent.participants).toContainEqual(userId);
    });

    it('should return 400 if user is already participating', async () => {
      // Create a user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'user',
      });
      await user.save();

      // Create an event with the user as a participant
      const eventId = new mongoose.Types.ObjectId();
      const event = new Event({
        _id: eventId,
        title: 'Test Event',
        description: 'Description',
        start_date: new Date('2025-05-01T10:00:00Z'),
        end_date: new Date('2025-05-02T10:00:00Z'),
        created_by: new mongoose.Types.ObjectId(),
        event_type: 'in-person',
        localisation: 'Test Location',
        lieu: 'Test Venue',
        heure: '10:00',
        contact_email: 'contact@example.com',
        participants: [userId],
      });
      await event.save();

      // Mock JWT verification
      jwt.verify.mockReturnValue({ id: userId.toString() });

      const response = await request(app)
        .post(`/event/${eventId}/participate`)
        .set('Authorization', `Bearer validtoken`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('You are already participating');
    });

    it('should return 401 if no token is provided', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const response = await request(app).post(`/event/${eventId}/participate`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 403 if token is invalid', async () => {
      const eventId = new mongoose.Types.ObjectId();
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post(`/event/${eventId}/participate`)
        .set('Authorization', `Bearer invalidtoken`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Invalid token');
    });
  });
});

module.exports = describe;