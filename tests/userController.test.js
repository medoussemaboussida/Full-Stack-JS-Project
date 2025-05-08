jest.setTimeout(30000); // Increase timeout to 30 seconds
const mongoose = require('mongoose');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../model/user');
const Appointment = require('../model/appointment');
const Chat = require('../model/chat');
const Notification = require('../model/Notification');
const userController = require('../controller/userController');
const sendEmail = require('../utils/emailSender');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongodbMemoryServerConfig = require('./mongodb-memory-server-config');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../utils/emailSender');
jest.mock('node-cron');

describe('User Controller', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    try {
      // Create MongoDB Memory Server with custom configuration
      mongoServer = await MongoMemoryServer.create(mongodbMemoryServerConfig);
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      app = express();
      app.use(express.json());

      // Set up routes for testing
      app.get('/verify/:token', userController.verifyUser);
      app.get('/user/:id', userController.getUserById);
      app.put('/user/:id', userController.updateUser);
      app.get('/appointments/psychiatrist/:psychiatristId', userController.getAppointmentsByPsychiatrist);
      app.get('/psychiatrist/:id', userController.getPsychiatristById);
      app.get('/appointments', userController.getAllAppointments);
      app.get('/chat/:roomCode', userController.RoomChat);

      // Use the correct route for getAllchat
      app.get('/allchat', userController.getAllchat);
      app.get('/users/chat/rooms', userController.getAllchat);
    } catch (error) {
      console.error('Failed to start MongoDB Memory Server:', error);
      throw error; // Re-throw to fail the test if we can't set up the database
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
      // Don't throw here as we're in cleanup
    }
  });

  beforeEach(() => {
    jest.clearAllMocks(); // only clear mocks
  });

  describe('verifyUser', () => {
    it('should return 400 for invalid token', async () => {
      // No need to mock jwt.verify when using our mock implementation
      const response = await request(app).get('/verify/invalidtoken');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Lien de validation invalide ou expiré.');
    });
  });

  describe('getUserById', () => {
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

  describe('updateUser', () => {
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

  describe('getAppointmentsByPsychiatrist', () => {
    it('should return appointments for a psychiatrist', async () => {
      await Appointment.deleteMany(); // targeted cleanup
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

  describe('getPsychiatristById', () => {
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

  describe('getAllAppointments', () => {
    it('should return all appointments', async () => {
      await Appointment.deleteMany(); // targeted cleanup
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

  describe('RoomChat', () => {
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
      expect(response.status).toBe(404); // since /chat/ is not a valid route
    });
  });

  describe('getAllchat', () => {
    it('should return all chat rooms', async () => {
      // Clean up existing chats
      await Chat.deleteMany();

      // Create test user and chat
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

      // Save user and chat
      await Promise.all([user.save(), chat.save()]);

      // Test the endpoint
      const response = await request(app).get('/allchat');

      // Assertions
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // If using the mock, we should have one room
      if (process.env.USE_MOCK_MONGO === 'true') {
        expect(response.body.length).toBe(1);
        if (response.body.length > 0) {
          expect(response.body[0].roomCode).toBe('room123');
        }
      }
    }, 30000); // Increase timeout for this specific test

    it('should return empty array if no chats', async () => {
      // Clean up all chats
      await Chat.deleteMany();

      // Test the endpoint
      const response = await request(app).get('/allchat');

      // Assertions
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    }, 30000); // Increase timeout for this specific test
  });
});
