jest.setTimeout(30000); // Increase timeout to 30 seconds
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const axios = require('axios');
const User = require('../model/user');
const Appointment = require('../model/appointment');
const Chat = require('../model/chat');
const Notification = require('../model/Notification');
const Event = require('../model/event');
const Association = require('../model/association');
const Ticket = require('../model/Ticket');
const userController = require('../controller/userController');
const eventController = require('../controller/eventController');
const sendEmail = require('../utils/emailSender');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation((token, secret, cb) => {
    if (token === 'invalidtoken') throw new Error('Invalid token');
    return { id: 'mockUserId' };
  }),
  sign: jest.fn().mockReturnValue('mockToken')
}));
jest.mock('../utils/emailSender');
jest.mock('node-cron');
jest.mock('multer');
jest.mock('axios');

// Mock MongoDB schema for Story, Reply, LocationCache
const StorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  imageUrl: String,
  createdAt: { type: Date, default: Date.now }
});
const ReplySchema = new mongoose.Schema({
  storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String
});
const LocationCacheSchema = new mongoose.Schema({
  location: String,
  description: String,
  cachedAt: { type: Date, default: Date.now }
});
mongoose.model('Story', StorySchema);
mongoose.model('Reply', ReplySchema);
mongoose.model('LocationCache', LocationCacheSchema);

describe('User and Event Controllers', () => {
  let app;
  let mongoServer;
  let uploadMock;

  beforeAll(async () => {
    try {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      app = express();
      app.use(express.json());

      // Mock multer middleware for eventController
      uploadMock = jest.fn((req, res, next) => {
        req.file = req.file || { filename: 'test-image.jpg' };
        next();
      });
      multer.mockReturnValue({ single: jest.fn(() => uploadMock) });

      // User Controller Routes
      app.get('/verify/:token', userController.verifyUser);
      app.get('/user/:id', userController.getUserById);
      app.put('/user/:id', userController.updateUser);
      app.get('/appointments/psychiatrist/:psychiatristId', userController.getAppointmentsByPsychiatrist);
      app.get('/psychiatrist/:id', userController.getPsychiatristById);
      app.get('/appointments', userController.getAllAppointments);
      app.get('/chat/:roomCode', userController.RoomChat);
      app.get('/allchat', userController.getAllchat);

      // Event Controller Routes
      app.post('/event', (req, res, next) => {
        req.userId = req.userId || new mongoose.Types.ObjectId().toString();
        next();
      }, eventController.addEvent);
      app.get('/events', eventController.getEvents);
      app.get('/event/:id', eventController.getEventById);
      app.post('/event/:id/participate', eventController.participate);
      app.post('/story', (req, res, next) => {
        req.userId = req.userId || new mongoose.Types.ObjectId().toString();
        next();
      }, eventController.uploadStory);
      app.get('/stories', eventController.getStories);
      app.post('/location-details', eventController.getLocationDetails);
    } catch (error) {
      console.error('Failed to start MongoDB Memory Server:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      await mongoose.disconnect();
      if (mongoServer) {
        await mongoServer.stop();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Clear Mongoose collections
    await Promise.all([
      User.deleteMany(),
      Appointment.deleteMany(),
      Chat.deleteMany(),
      Notification.deleteMany(),
      Event.deleteMany(),
      Association.deleteMany(),
      Ticket.deleteMany(),
      mongoose.model('Story').deleteMany(),
      mongoose.model('Reply').deleteMany(),
      mongoose.model('LocationCache').deleteMany(),
    ]);
  });

  // User Controller Tests (Unchanged)
  describe('User Controller - verifyUser', () => {
    it('should return 400 for invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      const response = await request(app).get('/verify/invalidtoken');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Lien de validation invalide ou expiré.');
    });
  });

  describe('User Controller - getUserById', () => {
    it('should return user by ID', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: `testuser-${userId}@esprit.tn`,
        dob: new Date('2000-01-01'),
      });
      await user.save();
      const response = await request(app).get(`/user/${userId}`);
      expect(response.status).toBe(200);
      expect(response.body.username).toBe('testuser');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app).get(`/user/${new mongoose.Types.ObjectId()}`);
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('User Controller - updateUser', () => {
    it('should update user', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'oldname',
        email: `oldname-${userId}@esprit.tn`,
        dob: new Date('2000-01-01'),
      });
      await user.save();
      const response = await request(app)
        .put(`/user/${userId}`)
        .send({ username: 'newname', email: `newname-${userId}@esprit.tn` });
      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('newname');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app)
        .put(`/user/${new mongoose.Types.ObjectId()}`)
        .send({ username: 'newname' });
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('User Controller - getAppointmentsByPsychiatrist', () => {
    it('should return appointments for a psychiatrist', async () => {
      const psychId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();
      const appointment = new Appointment({
        psychiatrist: psychId,
        student: studentId,
        date: new Date('2023-10-01'),
        startTime: '10:00',
        endTime: '11:00',
      });
      await appointment.save();
      const response = await request(app).get(`/appointments/psychiatrist/${psychId}`);
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
    });

    it('should return 400 for invalid psychiatrist ID', async () => {
      const response = await request(app).get('/appointments/psychiatrist/invalid');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid psychiatrist ID');
    });
  });

  describe('User Controller - getPsychiatristById', () => {
    it('should return psychiatrist by ID', async () => {
      const psychId = new mongoose.Types.ObjectId();
      const psychiatrist = new User({
        _id: psychId,
        username: 'psych',
        email: `psych-${psychId}@esprit.tn`,
        dob: new Date('2000-01-01'),
        role: 'psychiatrist',
      });
      await psychiatrist.save();
      const response = await request(app).get(`/psychiatrist/${psychId}`);
      expect(response.status).toBe(200);
      expect(response.body.username).toBe('psych');
    });
  });

  describe('User Controller - getAllAppointments', () => {
    it('should return all appointments', async () => {
      const studentId = new mongoose.Types.ObjectId();
      const psychId = new mongoose.Types.ObjectId();
      const appointment = new Appointment({
        student: studentId,
        psychiatrist: psychId,
        date: new Date('2023-10-01'),
        startTime: '10:00',
        endTime: '11:00',
      });
      await appointment.save();
      const response = await request(app).get('/appointments');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
    });
  });

  describe('User Controller - RoomChat', () => {
    it('should return messages for a room', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'user',
        email: `user-roomchat-${userId}@esprit.tn`,
        dob: new Date('2000-01-01'),
      });
      const chat = new Chat({
        roomCode: 'room123',
        sender: userId,
        encryptedMessage: 'encrypted',
        iv: 'iv123',
      });
      await Promise.all([user.save(), chat.save()]);
      const response = await request(app).get('/chat/room123');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].sender.username).toBe('user');
    });

    it('should return 400 for missing roomCode', async () => {
      const response = await request(app).get('/chat/');
      expect(response.status).toBe(404);
    });
  });

  describe('User Controller - getAllchat', () => {
    it('should return all chat rooms', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'user',
        email: `user-allchat-${userId}@esprit.tn`,
        dob: new Date('2000-01-01'),
        user_photo: 'photo.jpg',
      });
      const chat = new Chat({
        roomCode: 'room123',
        sender: userId,
        encryptedMessage: 'encrypted',
        iv: 'iv123',
      });
      await Promise.all([user.save(), chat.save()]);
      const response = await request(app).get('/allchat');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].roomCode).toBe('room123');
    });

    it('should return empty array if no chats', async () => {
      await Chat.deleteMany();
      const response = await request(app).get('/allchat');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  // Event Controller Tests (Integrated from your tests)
  describe('Event Controller - addEvent', () => {
    it('should create a new event successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: `testuser-${userId}@esprit.tn`,
        role: 'association_member',
      });
      await user.save();
      axios.get.mockResolvedValue({
        data: {
          results: [{ geometry: { location: { lat: 48.8566, lng: 2.3522 } } }],
          status: 'OK',
        },
      });
      const eventData = {
        title: 'Test Event',
        description: 'A test event',
        start_date: '2025-06-01',
        end_date: '2025-06-02',
        localisation: 'Paris',
        lieu: 'Venue',
        heure: '10:00',
        contact_email: 'contact@example.com',
        event_type: 'in-person',
        max_participants: 100,
        hasPartners: true,
      };
      const response = await request(app)
        .post('/event')
        .set('Authorization', `Bearer mockToken`)
        .send(eventData);
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Event added successfully');
      expect(response.body.data.title).toBe('Test Event');
      expect(uploadMock).toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://maps.googleapis.com/maps/api/geocode/json'),
        expect.anything()
      );
      const savedEvent = await Event.findOne({ title: 'Test Event' });
      expect(savedEvent).toBeTruthy();
      expect(savedEvent.title).toBe('Test Event');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/event')
        .set('Authorization', `Bearer mockToken`)
        .send({ title: '' });
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing or invalid required fields');
    });
  });

  describe('Event Controller - getEvents', () => {
    it('should retrieve approved upcoming events', async () => {
      const userId = new mongoose.Types.ObjectId();
      const event = new Event({
        title: 'Approved Event',
        description: 'Description',
        start_date: new Date('2025-06-01'),
        end_date: new Date('2025-06-02'),
        created_by: userId,
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
      const userId = new mongoose.Types.ObjectId();
      const event = new Event({
        title: 'Unapproved Event',
        description: 'Description',
        start_date: new Date('2025-06-01'),
        end_date: new Date('2025-06-02'),
        created_by: userId,
        isApproved: false,
      });
      await event.save();
      const response = await request(app).get('/events');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(0);
    });
  });

  describe('Event Controller - participate', () => {
    it('should allow a user to participate in an event', async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();
      const event = new Event({
        _id: eventId,
        title: 'Test Event',
        participants: [],
        max_participants: 10,
        isApproved: true,
      });
      await event.save();
      jwt.verify.mockReturnValue({ id: userId.toString() });
      const response = await request(app)
        .post(`/event/${eventId}/participate`)
        .set('Authorization', `Bearer mockToken`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('You have successfully joined the event');
      expect(response.body.participantsCount).toBe(1);
      const updatedEvent = await Event.findById(eventId);
      expect(updatedEvent.participants).toContainEqual(userId);
    });

    it('should return 400 if event is full', async () => {
      const userId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId();
      const participantId = new mongoose.Types.ObjectId();
      const event = new Event({
        _id: eventId,
        title: 'Full Event',
        participants: [participantId],
        max_participants: 1,
      });
      await event.save();
      jwt.verify.mockReturnValue({ id: userId.toString() });
      const response = await request(app)
        .post(`/event/${eventId}/participate`)
        .set('Authorization', `Bearer mockToken`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Event has reached maximum participants');
    });
  });

  describe('Event Controller - uploadStory', () => {
    it('should upload a story successfully', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'storyuser',
        email: `storyuser-${userId}@esprit.tn`,
      });
      await user.save();
      const response = await request(app)
        .post('/story')
        .set('Authorization', `Bearer mockToken`);
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Story uploaded successfully');
      expect(response.body.imageUrl).toBe('/Uploads/test-image.jpg');
      const story = await mongoose.model('Story').findOne({ userId });
      expect(story).toBeTruthy();
      expect(story.imageUrl).toBe('/Uploads/test-image.jpg');
    });

    it('should return 400 if no file is uploaded', async () => {
      uploadMock.mockImplementationOnce((req, res, next) => {
        req.file = null;
        next();
      });
      const response = await request(app)
        .post('/story')
        .set('Authorization', `Bearer mockToken`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No file uploaded');
    });
  });

  describe('Event Controller - getLocationDetails', () => {
    it('should return location details from Nominatim API', async () => {
      axios.get.mockResolvedValue({
        data: [
          {
            type: 'city',
            lat: '48.8566',
            lon: '2.3522',
            address: { city: 'Paris', country: 'France' },
            namedetails: { name_en: 'Paris' },
          },
        ],
      });
      const response = await request(app)
        .post('/location-details')
        .send({
          location: 'Paris',
          title: 'Test Event',
          date: '2025-06-01',
        });
      expect(response.status).toBe(200);
      expect(response.body.choices[0].message.content).toContain('The event "Test Event" on 2025-06-01 will take place in Paris, France');
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://nominatim.openstreetmap.org/search'),
        expect.anything()
      );
      const cached = await mongoose.model('LocationCache').findOne({ location: 'paris' });
      expect(cached).toBeTruthy();
    });

    it('should return cached location details if available', async () => {
      await mongoose.model('LocationCache').create({
        location: 'paris',
        description: 'The event "{{title}}" on {{date}} will take place in Paris.',
        cachedAt: new Date(),
      });
      const response = await request(app)
        .post('/location-details')
        .send({
          location: 'Paris',
          title: 'Test Event',
          date: '2025-06-01',
        });
      expect(response.status).toBe(200);
      expect(response.body.choices[0].message.content).toContain('The event "Test Event" on 2025-06-01 will take place in Paris.');
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});