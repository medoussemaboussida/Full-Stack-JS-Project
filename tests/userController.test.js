const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../model/user');
const Appointment = require('../model/appointment');
const Chat = require('../model/chat');
const Notification = require('../model/Notification');
const userController = require('./userController');
const sendEmail = require('../utils/emailSender');
const crypto = require('crypto');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../utils/emailSender');
jest.mock('node-cron');

describe('User Controller', () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    // Start MongoDB in-memory server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

    // Set up Express app for testing
    app = express();
    app.use(express.json());

    // Define routes directly instead of using app.use
    app.post('/addStudent', userController.addStudent);
    app.post('/login', userController.login);
    app.get('/session/:id', userController.Session);
    app.get('/student/token/:token', userController.getStudentBytoken);
    app.post('/logout', userController.logout);
    app.put('/student/:id', userController.updateStudentProfile);
    app.put('/psychiatrist/:id/description', userController.updatePsychiatristDescription);
    app.get('/student/:id', userController.getStudentById);
    app.get('/user/:id', userController.getUserById);
    app.put('/user/:id', userController.updateUser);
    app.delete('/user/:id', userController.deleteUser);
    app.delete('/users', userController.deleteAllUsers);
    app.get('/search', userController.searchUsers);
    app.get('/psychiatrists', userController.getPsychiatrists);
    app.post('/psychiatrist/:id/availability', userController.verifyToken, userController.addAvailability);
    app.delete('/psychiatrist/:id/availability/:index', userController.verifyToken, userController.deleteAvailability);
    app.put('/psychiatrist/:id/availability/:index', userController.verifyToken, userController.updateAvailability);
    app.post('/appointment', userController.verifyToken, userController.bookAppointment);
    app.get('/appointments/psychiatrist/:psychiatristId', userController.getAppointmentsByPsychiatrist);
    app.get('/appointments/history', userController.verifyToken, userController.getAppointmentHistory);
    app.put('/appointment/:appointmentId/status', userController.verifyToken, userController.updateAppointmentStatus);
    app.get('/notifications', userController.verifyToken, userController.getUserNotifications);
    app.put('/notification/:notificationId/read', userController.verifyToken, userController.markNotificationAsRead);
    app.get('/psychiatrist/:id', userController.getPsychiatristById);
    app.put('/appointment/:id', userController.verifyToken, userController.updateAppointment);
    app.delete('/appointment/:appointmentId', userController.verifyToken, userController.deleteAppointment);
    app.get('/appointments', userController.getAllAppointments);
    app.post('/chat', userController.verifyToken, userController.sendMessage);
    app.get('/chat/:roomCode', userController.RoomChat);
    app.delete('/chat/:messageId', userController.verifyToken, userController.deletechat);
    app.put('/chat/:messageId', userController.verifyToken, userController.updatechat);
    app.get('/photo', userController.verifyToken, userController.photo);
    app.get('/allchat', userController.getAllchat);
    app.get('/allappoint', userController.getAllAppoint);
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

  describe('addStudent', () => {
    it('should create a new student', async () => {
      const studentData = {
        username: 'teststudent',
        dob: '2000-01-01',
        email: 'test@example.com',
        password: 'password123',
        speciality: 'Computer Science',
        level: 3,
      };
      const response = await request(app).post('/addStudent').send(studentData);
      expect(response.status).toBe(201);
      expect(response.body.username).toBe(studentData.username);
      expect(response.body.role).toBe('student');
    });

    it('should return 500 on error', async () => {
      jest.spyOn(User.prototype, 'save').mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      const response = await request(app).post('/addStudent').send({});
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Database error');
    });
  });

  describe('login', () => {
    it('should login a user with correct credentials', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'student',
        username: 'testuser',
      });
      await user.save();
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mocktoken');

      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'password123' });
      expect(response.status).toBe(200);
      expect(response.body.token).toBe('mocktoken');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 for incorrect email', async () => {
      const response = await request(app)
        .post('/login')
        .send({ email: 'wrong@example.com', password: 'password123' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email incorrect');
    });

    it('should return 401 for incorrect password', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'hashedpassword',
      });
      await user.save();
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Password or Email incorrect');
    });
  });

  describe('Session', () => {
    it('should return user session data', async () => {
      const user = new User({
        _id: '123',
        username: 'testuser',
        email: 'test@example.com',
        role: 'student',
      });
      await user.save();

      const response = await request(app).get('/session/123');
      expect(response.status).toBe(200);
      expect(response.body.username).toBe('testuser');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app).get('/session/999');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('getStudentBytoken', () => {
    it('should return student by validation token', async () => {
      const user = new User({
        email: 'test@example.com',
        role: 'student',
        validationToken: 'validtoken',
      });
      await user.save();

      const response = await request(app).get('/student/token/validtoken');
      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@example.com');
    });

    it('should return 404 if student not found', async () => {
      const response = await request(app).get('/student/token/invalidtoken');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Étudiant non trouvé');
    });
  });

  describe('logout', () => {
    it('should clear cookies and destroy session', async () => {
      const response = await request(app).post('/logout');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('updateStudentProfile', () => {
    it('should update student profile', async () => {
      const user = new User({
        _id: '123',
        username: 'oldname',
        email: 'old@example.com',
        role: 'student',
      });
      await user.save();

      const response = await request(app)
        .put('/student/123')
        .send({ username: 'newname', email: 'new@example.com' });
      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('newname');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app).put('/student/999').send({});
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('updatePsychiatristDescription', () => {
    it('should update psychiatrist description', async () => {
      const user = new User({
        _id: '123',
        role: 'psychiatrist',
      });
      await user.save();

      const response = await request(app)
        .put('/psychiatrist/123/description')
        .send({ description: 'New description' });
      expect(response.status).toBe(200);
      expect(response.body.user.description).toBe('New description');
    });

    it('should return 403 for non-psychiatrist', async () => {
      const user = new User({
        _id: '123',
        role: 'student',
      });
      await user.save();

      const response = await request(app)
        .put('/psychiatrist/123/description')
        .send({ description: 'New description' });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Action réservée aux psychiatres');
    });
  });

  describe('getStudentById', () => {
    it('should return student by ID', async () => {
      const user = new User({
        _id: '123',
        role: 'student',
        username: 'teststudent',
      });
      await user.save();

      const response = await request(app).get('/student/123');
      expect(response.status).toBe(200);
      expect(response.body.username).toBe('teststudent');
    });

    it('should return 404 if student not found', async () => {
      const response = await request(app).get('/student/999');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Étudiant non trouvé');
    });
  });

  describe('verifyUser', () => {
    it('should verify user and activate account', async () => {
      const user = new User({
        email: 'test@example.com',
        etat: false,
        validationToken: 'validtoken',
      });
      await user.save();
      jwt.verify.mockReturnValue({ id: 'test@example.com' });

      const response = await request(app).get('/verify/validtoken');
      expect(response.status).toBe(302); // Redirect
      expect(response.header.location).toBe('http://localhost:3000/login');
    });

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
      const user = new User({
        _id: '123',
        username: 'testuser',
      });
      await user.save();

      const response = await request(app).get('/user/123');
      expect(response.status).toBe(200);
      expect(response.body.username).toBe('testuser');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app).get('/user/999');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const user = new User({
        _id: '123',
        username: 'oldname',
      });
      await user.save();

      const response = await request(app)
        .put('/user/123')
        .send({ username: 'newname' });
      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('newname');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app).put('/user/999').send({});
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const user = new User({
        _id: '123',
        username: 'testuser',
      });
      await user.save();

      const response = await request(app).delete('/user/123');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Utilisateur supprimé avec succès');
    });

    it('should return 404 if user not found', async () => {
      const response = await request(app).delete('/user/999');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('deleteAllUsers', () => {
    it('should delete all users', async () => {
      await new User({ username: 'user1' }).save();
      await new User({ username: 'user2' }).save();

      const response = await request(app).delete('/users');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('2 utilisateurs supprimés avec succès.');
    });
  });

  describe('searchUsers', () => {
    it('should search users with filters', async () => {
      await new User({ username: 'testuser', email: 'test@example.com', role: 'student' }).save();
      await new User({ username: 'anotheruser', email: 'another@example.com', role: 'psychiatrist' }).save();

      const response = await request(app).get('/search?role=student');
      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(1);
      expect(response.body.users[0].role).toBe('student');
    });
  });

  describe('getPsychiatrists', () => {
    it('should return all psychiatrists', async () => {
      await new User({ role: 'psychiatrist', username: 'psych1' }).save();
      await new User({ role: 'student', username: 'student1' }).save();

      const response = await request(app).get('/psychiatrists');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].role).toBe('psychiatrist');
    });
  });

  describe('addAvailability', () => {
    it('should add availability for psychiatrist', async () => {
      const user = new User({
        _id: '123',
        role: 'psychiatrist',
        availability: [],
      });
      await user.save();
      jwt.verify.mockReturnValue({ id: '123', role: 'psychiatrist' });

      const response = await request(app)
        .post('/psychiatrist/123/availability')
        .set('Authorization', 'Bearer mocktoken')
        .send({ date: '2023-10-01', startTime: '10:00', endTime: '11:00' });
      expect(response.status).toBe(200);
      expect(response.body.user.availability[0].date).toBeDefined();
    });

    it('should return 403 for unauthorized user', async () => {
      jwt.verify.mockReturnValue({ id: '456', role: 'student' });

      const response = await request(app)
        .post('/psychiatrist/123/availability')
        .set('Authorization', 'Bearer mocktoken')
        .send({ date: '2023-10-01', startTime: '10:00', endTime: '11:00' });
      expect(response.status).toBe(403);
    });
  });

  describe('deleteAvailability', () => {
    it('should delete availability slot', async () => {
      const user = new User({
        _id: '123',
        role: 'psychiatrist',
        availability: [{ date: new Date('2023-10-01'), startTime: '10:00', endTime: '11:00' }],
      });
      await user.save();
      jwt.verify.mockReturnValue({ id: '123', role: 'psychiatrist' });

      const response = await request(app)
        .delete('/psychiatrist/123/availability/0')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(200);
      expect(response.body.user.availability.length).toBe(0);
    });

    it('should return 400 for invalid index', async () => {
      const user = new User({
        _id: '123',
        role: 'psychiatrist',
        availability: [],
      });
      await user.save();
      jwt.verify.mockReturnValue({ id: '123', role: 'psychiatrist' });

      const response = await request(app)
        .delete('/psychiatrist/123/availability/0')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid availability slot index');
    });
  });

  describe('updateAvailability', () => {
    it('should update availability slot', async () => {
      const user = new User({
        _id: '123',
        role: 'psychiatrist',
        availability: [{ date: new Date('2023-10-01'), startTime: '10:00', endTime: '11:00' }],
      });
      await user.save();
      jwt.verify.mockReturnValue({ id: '123', role: 'psychiatrist' });

      const response = await request(app)
        .put('/psychiatrist/123/availability/0')
        .set('Authorization', 'Bearer mocktoken')
        .send({ date: '2023-10-02', startTime: '12:00', endTime: '13:00' });
      expect(response.status).toBe(200);
      expect(response.body.user.availability[0].startTime).toBe('12:00');
    });

    it('should return 400 for invalid index', async () => {
      const user = new User({
        _id: '123',
        role: 'psychiatrist',
        availability: [],
      });
      await user.save();
      jwt.verify.mockReturnValue({ id: '123', role: 'psychiatrist' });

      const response = await request(app)
        .put('/psychiatrist/123/availability/0')
        .set('Authorization', 'Bearer mocktoken')
        .send({ date: '2023-10-02', startTime: '12:00', endTime: '13:00' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid availability slot index');
    });
  });

  describe('bookAppointment', () => {
    it('should book an appointment', async () => {
      const psychiatrist = new User({
        _id: '123',
        role: 'psychiatrist',
        availability: [{ date: new Date('2023-10-01'), startTime: '10:00', endTime: '11:00' }],
      });
      const student = new User({
        _id: '456',
        role: 'student',
        username: 'teststudent',
      });
      await Promise.all([psychiatrist.save(), student.save()]);
      jwt.verify.mockReturnValue({ id: '456', role: 'student' });

      const response = await request(app)
        .post('/appointment')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          psychiatristId: '123',
          date: '01/10/2023',
          startTime: '10:00',
          endTime: '11:00',
        });
      expect(response.status).toBe(201);
      expect(response.body.appointment.status).toBe('pending');
    });

    it('should return 400 for unavailable slot', async () => {
      const psychiatrist = new User({
        _id: '123',
        role: 'psychiatrist',
        availability: [],
      });
      const student = new User({
        _id: '456',
        role: 'student',
      });
      await Promise.all([psychiatrist.save(), student.save()]);
      jwt.verify.mockReturnValue({ id: '456', role: 'student' });

      const response = await request(app)
        .post('/appointment')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          psychiatristId: '123',
          date: '01/10/2023',
          startTime: '10:00',
          endTime: '11:00',
        });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('This slot is not available');
    });
  });

  describe('getAppointmentsByPsychiatrist', () => {
    it('should return appointments for a psychiatrist', async () => {
      const appointment = new Appointment({
        psychiatrist: '123',
        student: '456',
        date: new Date('2023-10-01'),
        startTime: '10:00',
        endTime: '11:00',
      });
      await appointment.save();

      const response = await request(app).get('/appointments/psychiatrist/123');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
    });

    it('should return 400 for invalid psychiatrist ID', async () => {
      const response = await request(app).get('/appointments/psychiatrist/invalid');
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid psychiatrist ID');
    });
  });

  describe('getAppointmentHistory', () => {
    it('should return appointment history for student', async () => {
      const student = new User({ _id: '456', role: 'student', username: 'teststudent' });
      const psychiatrist = new User({ _id: '123', role: 'psychiatrist', username: 'testpsych' });
      const appointment = new Appointment({
        student: '456',
        psychiatrist: '123',
        date: new Date('2023-10-01'),
        startTime: '10:00',
        endTime: '11:00',
      });
      await Promise.all([student.save(), psychiatrist.save(), appointment.save()]);
      jwt.verify.mockReturnValue({ id: '456', role: 'student' });

      const response = await request(app)
        .get('/appointments/history')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(200);
      expect(response.body.appointments.length).toBe(1);
    });

    it('should return 401 for unauthenticated user', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('No token');
      });

      const response = await request(app)
        .get('/appointments/history')
        .set('Authorization', 'Bearer invalid');
      expect(response.status).toBe(401);
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should update appointment status', async () => {
      const student = new User({ _id: '456', role: 'student', username: 'teststudent', email: 'student@example.com' });
      const psychiatrist = new User({ _id: '123', role: 'psychiatrist', username: 'testpsych', email: 'psych@example.com' });
      const appointment = new Appointment({
        _id: '789',
        student: '456',
        psychiatrist: '123',
        date: new Date('2023-10-01'),
        startTime: '10:00',
        endTime: '11:00',
        status: 'pending',
      });
      await Promise.all([student.save(), psychiatrist.save(), appointment.save()]);
      jwt.verify.mockReturnValue({ id: '123', role: 'psychiatrist' });
      sendEmail.mockResolvedValue(true);

      const response = await request(app)
        .put('/appointment/789/status')
        .set('Authorization', 'Bearer mocktoken')
        .send({ status: 'confirmed' });
      expect(response.status).toBe(200);
      expect(response.body.appointment.status).toBe('confirmed');
    });

    it('should return 403 for unauthorized user', async () => {
      const appointment = new Appointment({
        _id: '789',
        student: '456',
        psychiatrist: '123',
        status: 'pending',
      });
      await appointment.save();
      jwt.verify.mockReturnValue({ id: '456', role: 'student' });

      const response = await request(app)
        .put('/appointment/789/status')
        .set('Authorization', 'Bearer mocktoken')
        .send({ status: 'confirmed' });
      expect(response.status).toBe(403);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = new Notification({
        _id: '123',
        userId: '456',
        read: false,
      });
      await notification.save();
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .put('/notification/123/read')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(200);
      expect(response.body.notification.read).toBe(true);
    });

    it('should return 404 if notification not found', async () => {
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .put('/notification/999/read')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Notification not found or not authorized');
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const notification = new Notification({
        userId: '456',
        message: 'Test notification',
      });
      await notification.save();
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .get('/notifications')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(200);
      expect(response.body.notifications.length).toBe(1);
    });
  });

  describe('getPsychiatristById', () => {
    it('should return psychiatrist by ID', async () => {
      const psychiatrist = new User({
        _id: '123',
        role: 'psychiatrist',
        username: 'testpsych',
      });
      await psychiatrist.save();

      const response = await request(app).get('/psychiatrist/123');
      expect(response.status).toBe(200);
      expect(response.body.username).toBe('testpsych');
    });

    it('should return 404 if not a psychiatrist', async () => {
      const user = new User({
        _id: '123',
        role: 'student',
      });
      await user.save();

      const response = await request(app).get('/psychiatrist/123');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Psychiatrist not found');
    });
  });

  describe('updateAppointment', () => {
    it('should update appointment', async () => {
      const appointment = new Appointment({
        _id: '789',
        student: '456',
        psychiatrist: '123',
        date: new Date('2023-10-01'),
        startTime: '10:00',
        endTime: '11:00',
      });
      await appointment.save();
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .put('/appointment/789')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          date: '2023-10-02',
          startTime: '12:00',
          endTime: '13:00',
        });
      expect(response.status).toBe(200);
      expect(response.body.startTime).toBe('12:00');
    });

    it('should return 403 for unauthorized user', async () => {
      const appointment = new Appointment({
        _id: '789',
        student: '456',
        psychiatrist: '123',
      });
      await appointment.save();
      jwt.verify.mockReturnValue({ id: '123' });

      const response = await request(app)
        .put('/appointment/789')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          date: '2023-10-02',
          startTime: '12:00',
          endTime: '13:00',
        });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('deleteAppointment', () => {
    it('should delete appointment as student', async () => {
      const appointment = new Appointment({
        _id: '789',
        student: '456',
        psychiatrist: '123',
      });
      await appointment.save();
      const student = new User({ _id: '456', role: 'student' });
      await student.save();
      jwt.verify.mockReturnValue({ id: '456', role: 'student' });

      const response = await request(app)
        .delete('/appointment/789')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Rendez-vous supprimé avec succès');
    });

    it('should delete appointment as admin', async () => {
      const appointment = new Appointment({
        _id: '789',
        student: '456',
        psychiatrist: '123',
      });
      await appointment.save();
      const admin = new User({ _id: '999', role: 'admin' });
      await user.save();
      jwt.verify.mockReturnValue({ id: '999', role: 'admin' });

      const response = await request(app)
        .delete('/appointment/789')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Rendez-vous supprimé avec succès');
    });

    it('should return 403 for unauthorized user', async () => {
      const appointment = new Appointment({
        _id: '789',
        student: '456',
        psychiatrist: '123',
      });
      await appointment.save();
      jwt.verify.mockReturnValue({ id: '123', role: 'psychiatrist' });

      const response = await request(app)
        .delete('/appointment/789')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Seul un étudiant ou un administrateur peut supprimer un rendez-vous');
    });
  });

  describe('getAllAppointments', () => {
    it('should return all appointments', async () => {
      const appointment = new Appointment({
        student: '456',
        psychiatrist: '123',
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

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const user = new User({ _id: '456', username: 'testuser' });
      await user.save();
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .post('/chat')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          roomCode: 'room123',
          encryptedMessage: 'encrypted',
          iv: 'iv123',
          isVoice: false,
        });
      expect(response.status).toBe(201);
      expect(response.body.data.roomCode).toBe('room123');
    });

    it('should send a voice message', async () => {
      const user = new User({ _id: '456', username: 'testuser' });
      await user.save();
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .post('/chat')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          roomCode: 'room123',
          voiceMessage: 'base64voice',
          isVoice: true,
        });
      expect(response.status).toBe(201);
      expect(response.body.data.isVoice).toBe(true);
    });

    it('should return 400 for missing fields', async () => {
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .post('/chat')
        .set('Authorization', 'Bearer mocktoken')
        .send({ roomCode: 'room123', isVoice: false });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('encryptedMessage and iv are required for text messages');
    });
  });

  describe('RoomChat', () => {
    it('should return messages for a room', async () => {
      const user = new User({ _id: '456', username: 'testuser' });
      const chat = new Chat({
        roomCode: 'room123',
        sender: '456',
        encryptedMessage: 'encrypted',
        iv: 'iv123',
      });
      await Promise.all([user.save(), chat.save()]);

      const response = await request(app).get('/chat/room123');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].sender.username).toBe('testuser');
    });

    it('should return 400 for missing roomCode', async () => {
      const response = await request(app).get('/chat/');
      expect(response.status).toBe(404); // Depending on routing
    });
  });

  describe('deletechat', () => {
    it('should delete a message', async () => {
      const user = new User({ _id: '456', username: 'testuser' });
      const chat = new Chat({
        _id: '789',
        roomCode: 'room123',
        sender: '456',
        encryptedMessage: 'encrypted',
      });
      await Promise.all([user.save(), chat.save()]);
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .delete('/chat/789')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Message deleted');
    });

    it('should return 403 for unauthorized user', async () => {
      const chat = new Chat({
        _id: '789',
        roomCode: 'room123',
        sender: '456',
      });
      await chat.save();
      jwt.verify.mockReturnValue({ id: '123' });

      const response = await request(app)
        .delete('/chat/789')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Unauthorized');
    });
  });

  describe('updatechat', () => {
    it('should update a text message', async () => {
      const user = new User({ _id: '456', username: 'testuser' });
      const chat = new Chat({
        _id: '789',
        roomCode: 'room123',
        sender: '456',
        encryptedMessage: 'old',
        iv: 'oldiv',
        isVoice: false,
      });
      await Promise.all([user.save(), chat.save()]);
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .put('/chat/789')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          encryptedMessage: 'new',
          iv: 'newiv',
        });
      expect(response.status).toBe(200);
      expect(response.body.data.encryptedMessage).toBe('new');
    });

    it('should return 400 for voice message', async () => {
      const chat = new User({
        _id: '789',
        roomCode: 'room123',
        sender: '456',
        isVoice: true,
      });
      await chat.save();
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .put('/chat/789')
        .set('Authorization', 'Bearer mocktoken')
        .send({
          encryptedMessage: 'new',
          iv: 'newiv',
        });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Cannot update voice messages');
    });
  });

  describe('photo', () => {
    it('should return user photo and details', async () => {
      const user = new User({
        _id: '456',
        username: 'testuser',
        role: 'student',
        user_photo: '/uploads/photo.jpg',
      });
      await user.save();
      jwt.verify.mockReturnValue({ id: '456' });

      const response = await request(app)
        .get('/photo')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(200);
      expect(response.body.username).toBe('testuser');
      expect(response.body.user_photo).toBe('/uploads/photo.jpg');
    });

    it('should return 404 if user not found', async () => {
      jwt.verify.mockReturnValue({ id: '999' });

      const response = await request(app)
        .get('/photo')
        .set('Authorization', 'Bearer mocktoken');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });

  describe('getAllchat', () => {
    it('should return all chat rooms', async () => {
      const user = new User({ _id: '456', username: 'testuser', user_photo: 'photo.jpg' });
      const chat = new Chat({
        roomCode: 'room123',
        sender: '456',
        encryptedMessage: 'encrypted',
      });
      await Promise.all([user.save(), chat.save()]);

      const response = await request(app).get('/allchat');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].roomCode).toBe('room123');
      expect(response.body[0].participants[0].username).toBe('testuser');
    });

    it('should return empty array if no chats', async () => {
      const response = await request(app).get('/allchat');
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('getAllAppoint', () => {
    it('should return all appointments with populated fields', async () => {
      const student = new User({ _id: '456', username: 'teststudent', email: 'student@example.com' });
      const psychiatrist = new User({ _id: '123', username: 'testpsych', email: 'psych@example.com' });
      const appointment = new Appointment({
        student: '456',
        psychiatrist: '123',
        date: new Date('2023-10-01'),
        startTime: '10:00',
        endTime: '11:00',
      });
      await Promise.all([student.save(), psychiatrist.save(), appointment.save()]);

      const response = await request(app).get('/allappoint');
      expect(response.status).toBe(200);
      expect(response.body.appointments.length).toBe(1);
      expect(response.body.appointments[0].student.username).toBe('teststudent');
      expect(response.body.appointments[0].psychiatrist.username).toBe('testpsych');
    });
  });
});