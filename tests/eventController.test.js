jest.setTimeout(30000); // Increase timeout to 30 seconds
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const multer = require('multer');
const { MongoMemoryServer } = require('mongodb-memory-server');
const eventController = require('../controller/eventController');

// Mock dependencies
jest.mock('axios');
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation(() => ({ id: 'mockUserId' })),
  sign: jest.fn().mockReturnValue('mockToken'),
}));
jest.mock('multer', () => {
  const multerMock = jest.fn(() => ({
    single: jest.fn(() => (req, res, next) => {
      req.file = {
        filename: 'mock-image.jpg',
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
      };
      next();
    }),
  }));
  multerMock.diskStorage = jest.fn(() => ({
    destination: jest.fn((req, file, cb) => cb(null, 'Uploads/')),
    filename: jest.fn((req, file, cb) => cb(null, `mock-${file.originalname}`)),
  }));
  return multerMock;
});

// Suppress console logs during tests
console.log = jest.fn();
console.error = jest.fn();

describe('Event Controller', () => {
  let app;

  beforeAll(async () => {
    console.log('Starting beforeAll');
    try {
      // Use MockMongoMemoryServer
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);

      // Set up Express app
      app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));

      // Middleware to simulate authenticated user
      app.use((req, res, next) => {
        if (req.headers.authorization) {
          const token = req.headers.authorization.split(' ')[1];
          const decoded = jwt.verify(token);
          req.userId = decoded.id;
        }
        next();
      });

      // Set up route for testing
      app.post('/events', eventController.addEvent);
      console.log('beforeAll completed');
    } catch (error) {
      console.error('Failed to start MockMongoMemoryServer:', error);
      throw error;
    }
  });

  afterAll(async () => {
    console.log('Starting afterAll');
    try {
      await mongoose.disconnect();
      console.log('afterAll completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  beforeEach(async () => {
    console.log('Starting beforeEach');
    // Clear mock database collections
    mockDb.users = [];
    mockDb.events = [];
    // Reset mocks
    jest.clearAllMocks();
    axios.get.mockReset();
    console.log('beforeEach completed');
  });

  describe('POST /events', () => {
    it('should add a new event successfully', async () => {
      console.log('Running test: should add a new event successfully');
      // Create a user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      });
      await user.save();

      // Verify initial state
      expect(mockDb.events.length).toBe(0);

      // Event data
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2025-06-01',
        end_date: '2025-06-02',
        heure: '10:00',
        contact_email: 'contact@example.com',
        event_type: 'in-person',
        localisation: 'Test City',
        lieu: 'Test Venue',
        hasPartners: 'true', // Form-data sends strings
      };

      // Mock axios for geocoding
      axios.get.mockResolvedValue({
        data: {
          results: [{ geometry: { location: { lat: 48.8566, lng: 2.3522 } } }],
          status: 'OK',
        },
      });

      // Simulate file upload and form-data
      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer mockToken')
        .field('title', eventData.title)
        .field('description', eventData.description)
        .field('start_date', eventData.start_date)
        .field('end_date', eventData.end_date)
        .field('heure', eventData.heure)
        .field('contact_email', eventData.contact_email)
        .field('event_type', eventData.event_type)
        .field('localisation', eventData.localisation)
        .field('lieu', eventData.lieu)
        .field('hasPartners', eventData.hasPartners)
        .attach('image', Buffer.from('fake-image'), 'mock-image.jpg');

      // Verifications
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Event added successfully');
      expect(response.body.data).toHaveProperty('title', 'Test Event');

      expect(mockDb.events.length).toBe(1);
      expect(mockDb.events[0].title).toBe('Test Event');
      expect(mockDb.events[0].created_by.toString()).toBe(userId.toString());
      expect(mockDb.events[0].imageUrl).toBe('/Uploads/mock-image.jpg');
      expect(mockDb.events[0].coordinates).toEqual({ lat: 48.8566, lng: 2.3522 });
    });

    it('should return 403 if user is not an association member', async () => {
      console.log('Running test: should return 403 if user is not an association member');
      // Create a user with non-association role
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'student',
      });
      await user.save();

      // Event data
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2025-06-01',
        end_date: '2025-06-02',
        heure: '10:00',
        contact_email: 'contact@example.com',
        event_type: 'in-person',
        localisation: 'Test City',
        lieu: 'Test Venue',
        hasPartners: 'true',
      };

      // Mock axios for geocoding
      axios.get.mockResolvedValue({
        data: {
          results: [{ geometry: { location: { lat: 48.8566, lng: 2.3522 } } }],
          status: 'OK',
        },
      });

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer mockToken')
        .field('title', eventData.title)
        .field('description', eventData.description)
        .field('start_date', eventData.start_date)
        .field('end_date', eventData.end_date)
        .field('heure', eventData.heure)
        .field('contact_email', eventData.contact_email)
        .field('event_type', eventData.event_type)
        .field('localisation', eventData.localisation)
        .field('lieu', eventData.lieu)
        .field('hasPartners', eventData.hasPartners)
        .attach('image', Buffer.from('fake-image'), 'mock-image.jpg');

      // Verifications
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only association members can create events');

      expect(mockDb.events.length).toBe(0);
    });

    it('should return 404 if user not found', async () => {
      console.log('Running test: should return 404 if user not found');
      // Non-existent user ID
      const nonExistentId = new mongoose.Types.ObjectId();

      // Verify user does not exist
      const user = await User.findById(nonExistentId);
      expect(user).toEqual([]);

      // Event data
      const eventData = {
        title: 'Test Event',
        description: 'This is a test event',
        start_date: '2025-06-01',
        end_date: '2025-06-02',
        heure: '10:00',
        contact_email: 'contact@example.com',
        event_type: 'in-person',
        localisation: 'Test City',
        lieu: 'Test Venue',
        hasPartners: 'true',
      };

      // Mock axios for geocoding
      axios.get.mockResolvedValue({
        data: {
          results: [{ geometry: { location: { lat: 48.8566, lng: 2.3522 } } }],
          status: 'OK',
        },
      });

      // Mock jwt.verify to return non-existent user ID
      jwt.verify.mockReturnValueOnce({ id: nonExistentId.toString() });

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer mockToken')
        .field('title', eventData.title)
        .field('description', eventData.description)
        .field('start_date', eventData.start_date)
        .field('end_date', eventData.end_date)
        .field('heure', eventData.heure)
        .field('contact_email', eventData.contact_email)
        .field('event_type', eventData.event_type)
        .field('localisation', eventData.localisation)
        .field('lieu', eventData.lieu)
        .field('hasPartners', eventData.hasPartners)
        .attach('image', Buffer.from('fake-image'), 'mock-image.jpg');

      // Verifications
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');

      expect(mockDb.events.length).toBe(0);
    });

    it('should return 400 for invalid event data', async () => {
      console.log('Running test: should return 400 for invalid event data');
      // Create a user
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'testuser@example.com',
        role: 'association_member',
      });
      await user.save();

      // Invalid event data (missing required fields)
      const eventData = {
        description: 'This is a test event',
        // Missing title, start_date, etc.
      };

      const response = await request(app)
        .post('/events')
        .set('Authorization', 'Bearer mockToken')
        .field('description', eventData.description)
        .attach('image', Buffer.from('fake-image'), 'mock-image.jpg');

      // Verifications
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Please provide all required fields');

      expect(mockDb.events.length).toBe(0);
    });
  });
});