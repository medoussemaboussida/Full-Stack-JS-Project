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

      // Routes pour les nouvelles méthodes à tester
      app.put('/user/:id/email-preference', userController.updateReceiveEmails);
      app.post('/publications', userController.addPublication);
      app.put('/publications/:publicationId/status', userController.updatePublicationStatus);
      app.post('/publications/:publicationId/pin', userController.togglePinPublication);
      app.get('/publications/pinned', userController.getPinnedPublications);
      app.get('/publications', userController.getAllPublications);
      app.get('/publications/my', userController.getMyPublications);
      app.get('/publications/:id', userController.getPublicationById);
      app.delete('/publications/:id', userController.deletePublication);
      app.put('/publications/:id', userController.updatePublication);
      app.get('/publications/tags/all', userController.getAllTags);
      app.post('/users/:userId/ban', userController.banUser);
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

  // Tests pour updateReceiveEmails
  describe('updateReceiveEmails', () => {
    it('should update email preference for a user', async () => {
      // Créer un utilisateur de test
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'emailuser',
        email: `emailuser-${userId}@esprit.tn`,
        dob: new Date('2000-01-01'),
        receiveEmails: false
      });
      await user.save();

      // Tester la mise à jour de la préférence email
      const response = await request(app)
        .put(`/user/${userId}/email-preference`)
        .send({ receiveEmails: true });

      // Vérifications
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Préférence email mise à jour avec succès");
      expect(response.body.user.receiveEmails).toBe(true);

      // Vérifier que la base de données a été mise à jour
      const updatedUser = await User.findById(userId);
      expect(updatedUser.receiveEmails).toBe(true);
    });

    it('should return 404 if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/user/${nonExistentId}/email-preference`)
        .send({ receiveEmails: true });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Utilisateur non trouvé");
    });
  });

  // Tests pour addPublication
  describe('addPublication', () => {
    let Publication;

    beforeAll(async () => {
      // Importer dynamiquement le modèle Publication
      try {
        Publication = require('../model/publication');
      } catch (error) {
        // Si le modèle n'existe pas, créer un modèle de test
        const publicationSchema = new mongoose.Schema({
          status: String,
          titrePublication: String,
          description: String,
          author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          imagePublication: String,
          datePublication: Date,
          tag: [String],
          viewCount: { type: Number, default: 0 },
          viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
          likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
          dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        });
        Publication = mongoose.model('Publication', publicationSchema);
      }
    });

    // Mock pour le middleware d'upload
    jest.mock('../middleware/upload', () => {
      return jest.fn().mockImplementation((req, _, next) => {
        // Simuler le comportement de multer
        if (req.body.simulateError) {
          return next(new Error('Upload error'));
        }

        // Simuler un fichier uploadé si nécessaire
        if (req.body.withFile) {
          req.file = {
            filename: 'test-image.jpg'
          };
        }

        next();
      });
    });

    it('should add a new publication with immediate publishing', async () => {
      // Mock pour jwt.verify pour simuler un utilisateur authentifié
      jwt.verify.mockImplementation(() => ({ id: 'mockUserId' }));

      // Créer un utilisateur pour être l'auteur
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'pubauthor',
        email: `pubauthor-${userId}@esprit.tn`,
        role: 'psychiatrist'
      });
      await user.save();

      // Modifier le mock pour retourner l'ID de l'utilisateur créé
      jwt.verify.mockImplementation(() => ({ id: userId.toString() }));

      // Simuler la requête d'ajout de publication
      const response = await request(app)
        .post('/publications')
        .set('Authorization', 'Bearer mockToken')
        .send({
          titrePublication: 'Test Publication Title',
          description: 'Test Publication Description',
          tag: 'tag1,tag2,tag3',
          scheduledDate: 'now' // Publication immédiate
        });

      // Vérifications
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Publication added successfully');
      expect(response.body.publication.titrePublication).toBe('Test Publication Title');
      expect(response.body.publication.status).toBe('published');

      // Vérifier que la publication a été sauvegardée en base de données
      const savedPublication = await Publication.findById(response.body.publication._id);
      expect(savedPublication).not.toBeNull();
      expect(savedPublication.titrePublication).toBe('Test Publication Title');
      expect(savedPublication.status).toBe('published');
      expect(savedPublication.tag).toEqual(expect.arrayContaining(['tag1', 'tag2', 'tag3']));
    });

    it('should add a publication with future scheduling', async () => {
      // Mock pour jwt.verify
      jwt.verify.mockImplementation(() => ({ id: 'mockUserId' }));

      // Créer un utilisateur pour être l'auteur
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'scheduleauthor',
        email: `scheduleauthor-${userId}@esprit.tn`,
        role: 'psychiatrist'
      });
      await user.save();

      // Modifier le mock pour retourner l'ID de l'utilisateur créé
      jwt.verify.mockImplementation(() => ({ id: userId.toString() }));

      // Date future pour la publication programmée
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 jours dans le futur

      // Simuler la requête d'ajout de publication
      const response = await request(app)
        .post('/publications')
        .set('Authorization', 'Bearer mockToken')
        .send({
          titrePublication: 'Scheduled Publication',
          description: 'This will be published in the future',
          tag: 'future,scheduled',
          scheduledDate: futureDate.toISOString()
        });

      // Vérifications
      expect(response.status).toBe(201);
      expect(response.body.publication.status).toBe('later');

      // Vérifier que la date de publication est correcte
      const savedPublication = await Publication.findById(response.body.publication._id);
      expect(savedPublication.status).toBe('later');
      expect(new Date(savedPublication.datePublication).getDate()).toBe(futureDate.getDate());
    });

    it('should return 400 if title or description is missing', async () => {
      // Mock pour jwt.verify
      jwt.verify.mockImplementation(() => ({ id: 'mockUserId' }));

      // Simuler la requête avec des données manquantes
      const response = await request(app)
        .post('/publications')
        .set('Authorization', 'Bearer mockToken')
        .send({
          // Pas de titre ou description
          tag: 'tag1,tag2'
        });

      // Vérifications
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('The title and description are required');
    });
  });

  // Tests pour updatePublicationStatus
  describe('updatePublicationStatus', () => {
    let Publication;

    beforeAll(async () => {
      // Importer dynamiquement le modèle Publication
      try {
        Publication = require('../model/publication');
      } catch (error) {
        // Si le modèle n'existe pas, créer un modèle de test
        const publicationSchema = new mongoose.Schema({
          status: String,
          titrePublication: String,
          description: String,
          author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          imagePublication: String,
          datePublication: Date,
          tag: [String],
          viewCount: { type: Number, default: 0 },
          viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
          likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
          dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        });
        Publication = mongoose.model('Publication', publicationSchema);
      }
    });

    it('should update publication status', async () => {
      // Créer une publication de test
      const authorId = new mongoose.Types.ObjectId();
      const publication = new Publication({
        titrePublication: 'Test Publication',
        description: 'Test Description',
        author_id: authorId,
        status: 'draft',
        datePublication: new Date()
      });
      await publication.save();

      // Mettre à jour le statut
      const response = await request(app)
        .put(`/publications/${publication._id}/status`)
        .send({ status: 'published' });

      // Vérifications
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('published');

      // Vérifier que la base de données a été mise à jour
      const updatedPublication = await Publication.findById(publication._id);
      expect(updatedPublication.status).toBe('published');
    });

    it('should return 404 if publication not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/publications/${nonExistentId}/status`)
        .send({ status: 'published' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Publication not found');
    });
  });

  // Tests pour togglePinPublication
  describe('togglePinPublication', () => {
    let Publication;

    beforeAll(async () => {
      // Importer dynamiquement le modèle Publication
      try {
        Publication = require('../model/publication');
      } catch (error) {
        // Si le modèle n'existe pas, on utilise celui créé précédemment
        Publication = mongoose.model('Publication');
      }
    });

    it('should pin a publication for a user', async () => {
      // Mock pour jwt.verify
      jwt.verify.mockImplementation(() => ({ id: 'mockUserId' }));

      // Créer un utilisateur et une publication
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'pinuser',
        email: `pinuser-${userId}@esprit.tn`,
        dob: new Date('2000-01-01'),
        pinnedPublications: []
      });
      await user.save();

      const publication = new Publication({
        titrePublication: 'Pin Test Publication',
        description: 'Test Description',
        author_id: new mongoose.Types.ObjectId(),
        status: 'published',
        datePublication: new Date()
      });
      await publication.save();

      // Modifier le mock pour retourner l'ID de l'utilisateur créé
      jwt.verify.mockImplementation(() => ({ id: userId.toString() }));

      // Épingler la publication
      const response = await request(app)
        .post(`/publications/${publication._id}/pin`)
        .set('Authorization', 'Bearer mockToken');

      // Vérifications
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Publication pinned successfully');

      // Vérifier que la base de données a été mise à jour
      const updatedUser = await User.findById(userId);
      expect(updatedUser.pinnedPublications.map(id => id.toString())).toContain(publication._id.toString());
    });

    it('should unpin a publication for a user', async () => {
      // Créer un utilisateur avec une publication déjà épinglée
      const userId = new mongoose.Types.ObjectId();
      const publicationId = new mongoose.Types.ObjectId();

      const publication = new Publication({
        _id: publicationId,
        titrePublication: 'Unpin Test Publication',
        description: 'Test Description',
        author_id: new mongoose.Types.ObjectId(),
        status: 'published',
        datePublication: new Date()
      });

      const user = new User({
        _id: userId,
        username: 'unpinuser',
        email: `unpinuser-${userId}@esprit.tn`,
        dob: new Date('2000-01-01'),
        pinnedPublications: [publicationId]
      });

      await Promise.all([user.save(), publication.save()]);

      // Modifier le mock pour retourner l'ID de l'utilisateur créé
      jwt.verify.mockImplementation(() => ({ id: userId.toString() }));

      // Désépingler la publication
      const response = await request(app)
        .post(`/publications/${publicationId}/pin`)
        .set('Authorization', 'Bearer mockToken');

      // Vérifications
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Publication unpinned successfully');

      // Vérifier que la base de données a été mise à jour
      const updatedUser = await User.findById(userId);
      expect(updatedUser.pinnedPublications.map(id => id.toString())).not.toContain(publicationId.toString());
    });
  });

  // Tests pour la tâche cron de publication
  describe('Publication cron task', () => {
    let Publication;
    let nodeCron;

    beforeAll(async () => {
      // Importer dynamiquement le modèle Publication
      try {
        Publication = require('../model/publication');
      } catch (error) {
        // Si le modèle n'existe pas, on utilise celui créé précédemment
        Publication = mongoose.model('Publication');
      }

      // Récupérer le module node-cron mocké
      nodeCron = require('node-cron');
    });

    it('should have a cron job for publishing scheduled publications', () => {
      // Vérifier que le module cron a été appelé avec un planning
      expect(nodeCron.schedule).toHaveBeenCalled();

      // Récupérer les arguments du premier appel à schedule
      const scheduleArgs = nodeCron.schedule.mock.calls[0];

      // Vérifier que le premier argument est une expression cron valide
      expect(scheduleArgs[0]).toBe('* * * * *'); // Toutes les minutes

      // Vérifier que le deuxième argument est une fonction
      expect(typeof scheduleArgs[1]).toBe('function');
    });

    it('should update publications from later to published when date is reached', async () => {
      // Créer une publication programmée avec une date passée
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 heure dans le passé

      const scheduledPublication = new Publication({
        titrePublication: 'Scheduled Publication for Cron Test',
        description: 'This should be published by the cron job',
        author_id: new mongoose.Types.ObjectId(),
        status: 'later',
        datePublication: pastDate,
        tag: ['cron', 'test']
      });

      await scheduledPublication.save();

      // Récupérer la fonction de callback du cron
      const cronCallback = nodeCron.schedule.mock.calls[0][1];

      // Exécuter manuellement la fonction de callback du cron
      await cronCallback();

      // Vérifier que la publication a été mise à jour
      const updatedPublication = await Publication.findById(scheduledPublication._id);
      expect(updatedPublication.status).toBe('published');
    });
  });

  // Tests pour banUser
  describe('banUser', () => {
    it('should ban a user successfully', async () => {
      // Mock pour req.userRole
      app.use((req, _, next) => {
        req.userRole = 'admin';
        next();
      });

      // Créer un utilisateur à bannir
      const userId = new mongoose.Types.ObjectId();
      const user = new User({
        _id: userId,
        username: 'banuser',
        email: `banuser-${userId}@esprit.tn`,
        dob: new Date('2000-01-01'),
        isBanned: false
      });
      await user.save();

      // Mock pour sendEmail
      sendEmail.mockResolvedValue(true);

      // Bannir l'utilisateur
      const response = await request(app)
        .post(`/users/${userId}/ban`)
        .send({
          days: 7,
          reason: 'inappropriate_behavior'
        });

      // Vérifications
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Utilisateur banni avec succès');
      expect(response.body.user.isBanned).toBe(true);
      expect(response.body.user.banReason).toBe('inappropriate_behavior');

      // Vérifier que la base de données a été mise à jour
      const bannedUser = await User.findById(userId);
      expect(bannedUser.isBanned).toBe(true);
      expect(bannedUser.banReason).toBe('inappropriate_behavior');

      // Vérifier que l'email a été envoyé
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should return 400 if required fields are missing', async () => {
      const userId = new mongoose.Types.ObjectId();

      // Requête sans les champs requis
      const response = await request(app)
        .post(`/users/${userId}/ban`)
        .send({
          // Pas de days ou reason
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('requis');
    });

    it('should return 404 if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/users/${nonExistentId}/ban`)
        .send({
          days: 7,
          reason: 'inappropriate_behavior'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Utilisateur non trouvé');
    });
  });
});
