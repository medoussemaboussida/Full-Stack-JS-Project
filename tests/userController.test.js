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

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../utils/emailSender');
jest.mock('node-cron');

describe('User Controller', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    // Set up in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    // Set up Express app
    app = express();
    app.use(express.json());

    // Define routes
    app.get('/verify/:token', userController.verifyUser);
    app.get('/user/:id', userController.getUserById);
    app.put('/user/:id', userController.updateUser);
    app.delete('/user/:id', userController.deleteUser);
    app.delete('/users', userController.deleteAllUsers);
    app.get('/appointments/psychiatrist/:psychiatristId', userController.getAppointmentsByPsychiatrist);
    app.get('/psychiatrist/:id', userController.getPsychiatristById);
    app.get('/appointments', userController.getAllAppointments);
    app.get('/chat/:roomCode', userController.RoomChat);
    app.get('/allchat', userController.getAllchat);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Appointment.deleteMany({});
    await Chat.deleteMany({});
    await Notification.deleteMany({});
    jest.clearAllMocks();
  });

  describe('verifyUser', () => {
    it('should return 400 for invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

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
        email: 'test@esprit.tn',
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
        email: 'old@esprit.tn',
        dob: new Date('2000-01-01'),
      });
      await user.save();

      const response = await request(app)
        .put(`/user/${userId}`)
        .send({ username: 'newname', email: 'new@esprit.tn' });
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

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'testuser',
        email: 'test@esprit.tn',
        dob: new Date('2000-01-01'),
      });
      await user.save();

      const response = await request(app).delete(`/user/${userId}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Utilisateur supprimé avec succès');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app).delete(`/user/${new mongoose.Types.ObjectId()}`);
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('deleteAllUsers', () => {
    it('should delete all users', async () => {
      await new User({
        username: 'user1',
        email: 'user1@esprit.tn',
        dob: new Date('2000-01-01'),
      }).save();
      await new User({
        username: 'user2',
        email: 'user2@esprit.tn',
        dob: new Date('2000-01-01'),
      }).save();

      const response = await request(app).delete('/users');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('2 utilisateurs supprimés avec succès.');
    });
  });

  describe('getAppointmentsByPsychiatrist', () => {
    it('should return appointments for a psychiatrist', async () => {
      const psychId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();
      const appointment = new Appointment({
        _id: new mongoose.Types.ObjectId(),
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
        email: 'psych@esprit.tn',
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
      const studentId = new mongoose.Types.ObjectId();
      const psychId = new mongoose.Types.ObjectId();
      const appointment = new Appointment({
        _id: new mongoose.Types.ObjectId(),
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
        email: 'user@esprit.tn',
        dob: new Date('2000-01-01'),
      });
      const chat = new Chat({
        _id: new mongoose.Types.ObjectId(),
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

  describe('getAllchat', () => {
    it('should return all chat rooms', async () => {
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'user',
        email: 'user@esprit.tn',
        dob: new Date('2000-01-01'),
        user_photo: 'photo.jpg',
      });
      const chat = new Chat({
        _id: new mongoose.Types.ObjectId(),
        roomCode: 'room123',
        sender: userId,
        encryptedMessage: 'encrypted',
      });
      await Promise.all([user.save(), chat.save()]);

      const response = await request(app).get('/allchat');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].roomCode).toBe('room123');
    });

    it('should return empty array if no chats', async () => {
      const response = await request(app).get('/allchat');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });
});