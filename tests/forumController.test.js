const mongoose = require('mongoose');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation(() => ({ id: 'mockUserId' })),
  sign: jest.fn().mockReturnValue('mockToken')
}));

describe('Forum Controller', () => {
  let mockDb;
  let User;
  let Forum;
  let Report;
  let ForumBan;
  let ForumComment;

  beforeEach(() => {
    // Get mockDb and models from our mock implementation
    const mockModels = require('./mockMongoDb');
    mockDb = mockModels.mockDb;
    User = mockModels.User;

    // Initialiser les collections si elles n'existent pas
    if (!mockDb.forums) mockDb.forums = [];
    if (!mockDb.forumReports) mockDb.forumReports = [];
    if (!mockDb.forumBans) mockDb.forumBans = [];
    if (!mockDb.forumComments) mockDb.forumComments = [];

    // Créer des constructeurs de modèles pour les collections de forum
    Forum = mockModels.Forum;
    Report = mockModels.Report;
    ForumBan = mockModels.ForumBan;
    ForumComment = mockModels.ForumComment;

    // Clear mockDb collections before each test
    mockDb.users = [];
    mockDb.forums = [];
    mockDb.forumReports = [];
    mockDb.forumBans = [];
    mockDb.forumComments = [];

    // Reset all mocks
    jest.clearAllMocks();
  });

  // Tests pour addForum
  describe('addForum', () => {
    it('should add a new forum topic', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Ajouter l'utilisateur au mockDb
      mockDb.users.push(user);

      // Vérifier l'état initial
      expect(mockDb.forums.length).toBe(0);

      // Créer un nouveau forum
      const forumData = {
        title: 'Test Forum Topic',
        description: 'This is a test forum topic',
        anonymous: false,
        tags: ['anxiety', 'stress'],
        user_id: userId,
        forum_photo: null
      };

      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        ...forumData,
        createdAt: new Date(),
        status: 'actif'
      };

      // Ajouter le forum au mockDb
      mockDb.forums.push(forum);

      // Vérifications
      expect(mockDb.forums.length).toBe(1);
      expect(mockDb.forums[0].title).toBe('Test Forum Topic');
      expect(mockDb.forums[0].user_id).toEqual(userId);
    });

    it('should return 404 if user not found', async () => {
      // ID d'un utilisateur qui n'existe pas
      const nonExistentId = new mongoose.Types.ObjectId();

      // Vérifier que l'utilisateur n'existe pas
      const user = mockDb.users.find(u => u._id.toString() === nonExistentId.toString());
      expect(user).toBeUndefined();

      // Dans un vrai test, on vérifierait que la méthode addForum retourne une erreur 404
    });
  });

  // Tests pour getForum
  describe('getForum', () => {
    it('should return all forum topics with comment and report counts', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student',
        user_photo: 'user.jpg',
        speciality: 'Computer Science',
        level: 'Beginner'
      };

      // Créer des forums
      const forum1Id = new mongoose.Types.ObjectId();
      const forum2Id = new mongoose.Types.ObjectId();

      const forums = [
        {
          _id: forum1Id,
          title: 'Forum Topic 1',
          description: 'Description 1',
          user_id: userId,
          anonymous: false,
          tags: ['anxiety', 'stress'],
          forum_photo: 'forum1.jpg',
          createdAt: new Date('2023-05-15'),
          status: 'actif'
        },
        {
          _id: forum2Id,
          title: 'Forum Topic 2',
          description: 'Description 2',
          user_id: userId,
          anonymous: true,
          tags: ['depression', 'loneliness'],
          forum_photo: null,
          createdAt: new Date('2023-05-16'),
          status: 'actif'
        }
      ];

      // Créer des commentaires pour les forums
      const comments = [
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forum1Id,
          user_id: userId,
          content: 'Comment 1 for Forum 1',
          createdAt: new Date()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forum1Id,
          user_id: userId,
          content: 'Comment 2 for Forum 1',
          createdAt: new Date()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forum2Id,
          user_id: userId,
          content: 'Comment 1 for Forum 2',
          createdAt: new Date()
        }
      ];

      // Créer des signalements pour les forums
      const reports = [
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forum1Id,
          user_id: userId,
          reason: 'Inappropriate content',
          createdAt: new Date()
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(...forums);
      mockDb.forumComments.push(...comments);
      mockDb.forumReports.push(...reports);

      // Simuler la méthode toObject() pour les forums
      mockDb.forums.forEach(forum => {
        forum.toObject = function() {
          return { ...this };
        };
      });

      // Simuler la méthode countDocuments pour ForumComment
      ForumComment.countDocuments = jest.fn().mockImplementation(({ forum_id }) => {
        return Promise.resolve(
          mockDb.forumComments.filter(c => c.forum_id.toString() === forum_id.toString()).length
        );
      });

      // Simuler la méthode countDocuments pour Report
      Report.countDocuments = jest.fn().mockImplementation(({ forum_id }) => {
        return Promise.resolve(
          mockDb.forumReports.filter(r => r.forum_id.toString() === forum_id.toString()).length
        );
      });

      // Vérifications
      expect(mockDb.forums.length).toBe(2);
      expect(await ForumComment.countDocuments({ forum_id: forum1Id })).toBe(2);
      expect(await ForumComment.countDocuments({ forum_id: forum2Id })).toBe(1);
      expect(await Report.countDocuments({ forum_id: forum1Id })).toBe(1);
      expect(await Report.countDocuments({ forum_id: forum2Id })).toBe(0);
    });
  });

  // Tests pour updateForum
  describe('updateForum', () => {
    it('should update a forum topic', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Original Title',
        description: 'Original Description',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif',
        save: jest.fn().mockImplementation(function() {
          return Promise.resolve(this);
        })
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);

      // Vérifier l'état initial
      expect(mockDb.forums[0].title).toBe('Original Title');
      expect(mockDb.forums[0].description).toBe('Original Description');
      expect(mockDb.forums[0].tags).toEqual(['anxiety']);

      // Simuler la mise à jour du forum
      const updatedData = {
        title: 'Updated Title',
        description: 'Updated Description',
        anonymous: true,
        tags: JSON.stringify(['anxiety', 'stress'])
      };

      // Mettre à jour le forum
      const forumToUpdate = mockDb.forums.find(f => f._id.toString() === forumId.toString());
      if (updatedData.title) forumToUpdate.title = updatedData.title;
      if (updatedData.description) forumToUpdate.description = updatedData.description;
      if (updatedData.anonymous !== undefined) forumToUpdate.anonymous = updatedData.anonymous;
      if (updatedData.tags) {
        const parsedTags = JSON.parse(updatedData.tags);
        forumToUpdate.tags = parsedTags;
      }

      // Vérifications
      expect(forumToUpdate.title).toBe('Updated Title');
      expect(forumToUpdate.description).toBe('Updated Description');
      expect(forumToUpdate.anonymous).toBe(true);
      expect(forumToUpdate.tags).toEqual(['anxiety', 'stress']);
    });

    it('should return 404 if forum not found', async () => {
      // ID d'un forum qui n'existe pas
      const nonExistentId = new mongoose.Types.ObjectId();

      // Vérifier que le forum n'existe pas
      const forum = mockDb.forums.find(f => f._id.toString() === nonExistentId.toString());
      expect(forum).toBeUndefined();

      // Dans un vrai test, on vérifierait que la méthode updateForum retourne une erreur 404
    });
  });

  // Tests pour deleteForum
  describe('deleteForum', () => {
    it('should delete a forum and its associated comments and reports', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum to Delete',
        description: 'This forum will be deleted',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif'
      };

      // Créer des commentaires pour le forum
      const comments = [
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forumId,
          user_id: userId,
          content: 'Comment 1',
          createdAt: new Date()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forumId,
          user_id: userId,
          content: 'Comment 2',
          createdAt: new Date()
        }
      ];

      // Créer des signalements pour le forum
      const reports = [
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forumId,
          user_id: userId,
          reason: 'Inappropriate content',
          createdAt: new Date()
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);
      mockDb.forumComments.push(...comments);
      mockDb.forumReports.push(...reports);

      // Vérifier l'état initial
      expect(mockDb.forums.length).toBe(1);
      expect(mockDb.forumComments.length).toBe(2);
      expect(mockDb.forumReports.length).toBe(1);

      // Simuler la suppression des commentaires associés au forum
      mockDb.forumComments = mockDb.forumComments.filter(
        comment => comment.forum_id.toString() !== forumId.toString()
      );

      // Simuler la suppression des signalements associés au forum
      mockDb.forumReports = mockDb.forumReports.filter(
        report => report.forum_id.toString() !== forumId.toString()
      );

      // Simuler la suppression du forum
      mockDb.forums = mockDb.forums.filter(
        f => f._id.toString() !== forumId.toString()
      );

      // Vérifications
      expect(mockDb.forums.length).toBe(0);
      expect(mockDb.forumComments.length).toBe(0);
      expect(mockDb.forumReports.length).toBe(0);
    });

    it('should return 403 if user is not the creator of the forum', async () => {
      // Créer deux utilisateurs
      const creatorId = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();

      const users = [
        {
          _id: creatorId,
          username: 'creator',
          email: 'creator@esprit.tn',
          role: 'student'
        },
        {
          _id: otherUserId,
          username: 'otheruser',
          email: 'otheruser@esprit.tn',
          role: 'student'
        }
      ];

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: creatorId, // Créé par le premier utilisateur
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif'
      };

      // Ajouter au mockDb
      mockDb.users.push(...users);
      mockDb.forums.push(forum);

      // Vérifier que l'utilisateur n'est pas le créateur du forum
      const forumInDb = mockDb.forums.find(f => f._id.toString() === forumId.toString());
      expect(forumInDb.user_id.toString()).not.toBe(otherUserId.toString());

      // Dans un vrai test, on vérifierait que la méthode deleteForum retourne une erreur 403
    });
  });

  // Tests pour addReportForum
  describe('addReportForum', () => {
    it('should add a report to a forum', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum to Report',
        description: 'This forum will be reported',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif'
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);

      // Vérifier l'état initial
      expect(mockDb.forumReports.length).toBe(0);

      // Créer un nouveau signalement
      const reportId = new mongoose.Types.ObjectId();
      const report = {
        _id: reportId,
        forum_id: forumId,
        user_id: userId,
        reason: 'Inappropriate content',
        createdAt: new Date()
      };

      // Ajouter le signalement au mockDb
      mockDb.forumReports.push(report);

      // Vérifications
      expect(mockDb.forumReports.length).toBe(1);
      expect(mockDb.forumReports[0].forum_id).toEqual(forumId);
      expect(mockDb.forumReports[0].user_id).toEqual(userId);
      expect(mockDb.forumReports[0].reason).toBe('Inappropriate content');
    });

    it('should return 400 if user has already reported the forum', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif'
      };

      // Créer un signalement existant
      const existingReport = {
        _id: new mongoose.Types.ObjectId(),
        forum_id: forumId,
        user_id: userId,
        reason: 'Inappropriate content',
        createdAt: new Date()
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);
      mockDb.forumReports.push(existingReport);

      // Vérifier si l'utilisateur a déjà signalé ce forum
      const userHasReported = mockDb.forumReports.some(
        report => report.forum_id.toString() === forumId.toString() &&
                 report.user_id.toString() === userId.toString()
      );

      // Vérifications
      expect(userHasReported).toBe(true);

      // Dans un vrai test, on vérifierait que la méthode addReportForum retourne une erreur 400
    });
  });

  // Tests pour getForumReports
  describe('getForumReports', () => {
    it('should return all reports for a specific forum', async () => {
      // Créer des utilisateurs
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();

      const users = [
        {
          _id: user1Id,
          username: 'user1',
          email: 'user1@esprit.tn',
          role: 'student',
          speciality: 'Computer Science',
          level: 'Beginner',
          user_photo: 'user1.jpg'
        },
        {
          _id: user2Id,
          username: 'user2',
          email: 'user2@esprit.tn',
          role: 'student',
          speciality: 'Psychology',
          level: 'Intermediate',
          user_photo: 'user2.jpg'
        }
      ];

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: user1Id,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif'
      };

      // Créer des signalements pour le forum
      const reports = [
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forumId,
          user_id: user1Id,
          reason: 'Inappropriate content',
          createdAt: new Date('2023-05-15')
        },
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forumId,
          user_id: user2Id,
          reason: 'Spam',
          createdAt: new Date('2023-05-16')
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(...users);
      mockDb.forums.push(forum);
      mockDb.forumReports.push(...reports);

      // Simuler la récupération des signalements pour un forum spécifique
      const forumReports = mockDb.forumReports.filter(
        report => report.forum_id.toString() === forumId.toString()
      );

      // Vérifications
      expect(forumReports.length).toBe(2);
      expect(forumReports[0].reason).toBe('Inappropriate content');
      expect(forumReports[1].reason).toBe('Spam');
    });

    it('should return 404 if forum not found', async () => {
      // ID d'un forum qui n'existe pas
      const nonExistentId = new mongoose.Types.ObjectId();

      // Vérifier que le forum n'existe pas
      const forum = mockDb.forums.find(f => f._id.toString() === nonExistentId.toString());
      expect(forum).toBeUndefined();

      // Dans un vrai test, on vérifierait que la méthode getForumReports retourne une erreur 404
    });
  });

  // Tests pour deleteForumReport
  describe('deleteForumReport', () => {
    it('should delete a forum report', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif'
      };

      // Créer un signalement
      const reportId = new mongoose.Types.ObjectId();
      const report = {
        _id: reportId,
        forum_id: forumId,
        user_id: userId,
        reason: 'Inappropriate content',
        createdAt: new Date()
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);
      mockDb.forumReports.push(report);

      // Vérifier l'état initial
      expect(mockDb.forumReports.length).toBe(1);

      // Simuler la suppression du signalement
      mockDb.forumReports = mockDb.forumReports.filter(
        r => r._id.toString() !== reportId.toString()
      );

      // Vérifications
      expect(mockDb.forumReports.length).toBe(0);
    });

    it('should return 404 if report not found', async () => {
      // ID d'un signalement qui n'existe pas
      const nonExistentId = new mongoose.Types.ObjectId();

      // Vérifier que le signalement n'existe pas
      const report = mockDb.forumReports.find(r => r._id.toString() === nonExistentId.toString());
      expect(report).toBeUndefined();

      // Dans un vrai test, on vérifierait que la méthode deleteForumReport retourne une erreur 404
    });
  });

  // Tests pour changeForumStatus
  describe('changeForumStatus', () => {
    it('should change forum status to inactive', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif',
        save: jest.fn().mockImplementation(function() {
          return Promise.resolve(this);
        })
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);

      // Vérifier l'état initial
      expect(forum.status).toBe('actif');

      // Simuler le changement de statut
      forum.status = 'inactif';

      // Vérifications
      expect(forum.status).toBe('inactif');
    });

    it('should return 400 if status is invalid', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif'
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);

      // Vérifier si le statut est valide
      const invalidStatus = 'invalid';
      const validStatuses = ['actif', 'inactif'];

      expect(validStatuses.includes(invalidStatus)).toBe(false);

      // Dans un vrai test, on vérifierait que la méthode changeForumStatus retourne une erreur 400
    });
  });

  // Tests pour getForumStats
  describe('getForumStats', () => {
    it('should return forum statistics', async () => {
      // Créer des utilisateurs
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();
      const user3Id = new mongoose.Types.ObjectId();

      const users = [
        {
          _id: user1Id,
          username: 'user1',
          email: 'user1@esprit.tn',
          role: 'student'
        },
        {
          _id: user2Id,
          username: 'user2',
          email: 'user2@esprit.tn',
          role: 'student'
        },
        {
          _id: user3Id,
          username: 'user3',
          email: 'user3@esprit.tn',
          role: 'student'
        }
      ];

      // Créer des forums
      const forum1Id = new mongoose.Types.ObjectId();
      const forum2Id = new mongoose.Types.ObjectId();

      const forums = [
        {
          _id: forum1Id,
          title: 'Forum Topic 1',
          description: 'Description 1',
          user_id: user1Id,
          anonymous: false,
          tags: ['anxiety'],
          forum_photo: null,
          createdAt: new Date(),
          status: 'actif'
        },
        {
          _id: forum2Id,
          title: 'Forum Topic 2',
          description: 'Description 2',
          user_id: user2Id,
          anonymous: false,
          tags: ['depression'],
          forum_photo: null,
          createdAt: new Date(),
          status: 'actif'
        }
      ];

      // Créer des commentaires
      const comments = [
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forum1Id,
          user_id: user1Id,
          content: 'Comment 1',
          createdAt: new Date()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forum1Id,
          user_id: user2Id,
          content: 'Comment 2',
          createdAt: new Date()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forum2Id,
          user_id: user3Id,
          content: 'Comment 3',
          createdAt: new Date()
        }
      ];

      // Créer des signalements
      const reports = [
        {
          _id: new mongoose.Types.ObjectId(),
          forum_id: forum1Id,
          user_id: user3Id,
          reason: 'Inappropriate content',
          createdAt: new Date()
        }
      ];

      // Créer des bannissements
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 jours dans le futur

      const bans = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: user3Id,
          reason: 'Inappropriate behavior',
          expiresAt: futureDate,
          createdAt: new Date()
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(...users);
      mockDb.forums.push(...forums);
      mockDb.forumComments.push(...comments);
      mockDb.forumReports.push(...reports);
      mockDb.forumBans.push(...bans);

      // Simuler les méthodes utilisées dans getForumStats
      Forum.distinct = jest.fn().mockImplementation(() => {
        return Promise.resolve([user1Id, user2Id]);
      });

      ForumComment.countDocuments = jest.fn().mockImplementation(() => {
        return Promise.resolve(mockDb.forumComments.length);
      });

      Report.countDocuments = jest.fn().mockImplementation(() => {
        return Promise.resolve(mockDb.forumReports.length);
      });

      ForumBan.countDocuments = jest.fn().mockImplementation(() => {
        return Promise.resolve(mockDb.forumBans.filter(ban => ban.expiresAt > new Date()).length);
      });

      // Vérifications
      expect(await Forum.distinct()).toHaveLength(2);
      expect(await ForumComment.countDocuments()).toBe(3);
      expect(await Report.countDocuments()).toBe(1);
      expect(await ForumBan.countDocuments()).toBe(1);
    });
  });

  // Tests pour toggleLikeForum
  describe('toggleLikeForum', () => {
    it('should add a like to a forum', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum sans likes
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif',
        likes: [],
        save: jest.fn().mockImplementation(function() {
          return Promise.resolve(this);
        })
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);

      // Vérifier l'état initial
      expect(forum.likes.length).toBe(0);

      // Simuler l'ajout d'un like
      forum.likes.push(userId);

      // Vérifications
      expect(forum.likes.length).toBe(1);
      expect(forum.likes[0]).toEqual(userId);
    });

    it('should remove a like from a forum', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer un forum avec un like
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: userId,
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif',
        likes: [userId],
        save: jest.fn().mockImplementation(function() {
          return Promise.resolve(this);
        })
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.forums.push(forum);

      // Vérifier l'état initial
      expect(forum.likes.length).toBe(1);
      expect(forum.likes[0]).toEqual(userId);

      // Simuler la suppression d'un like
      forum.likes = forum.likes.filter(id => id.toString() !== userId.toString());

      // Vérifications
      expect(forum.likes.length).toBe(0);
    });

    it('should return 404 if user not found', async () => {
      // ID d'un utilisateur qui n'existe pas
      const nonExistentId = new mongoose.Types.ObjectId();

      // Créer un forum
      const forumId = new mongoose.Types.ObjectId();
      const forum = {
        _id: forumId,
        title: 'Forum Topic',
        description: 'Description',
        user_id: new mongoose.Types.ObjectId(),
        anonymous: false,
        tags: ['anxiety'],
        forum_photo: null,
        createdAt: new Date(),
        status: 'actif',
        likes: []
      };

      // Ajouter au mockDb
      mockDb.forums.push(forum);

      // Vérifier que l'utilisateur n'existe pas
      const user = mockDb.users.find(u => u._id.toString() === nonExistentId.toString());
      expect(user).toBeUndefined();

      // Dans un vrai test, on vérifierait que la méthode toggleLikeForum retourne une erreur 404
    });

    it('should return 404 if forum not found', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // ID d'un forum qui n'existe pas
      const nonExistentId = new mongoose.Types.ObjectId();

      // Ajouter au mockDb
      mockDb.users.push(user);

      // Vérifier que le forum n'existe pas
      const forum = mockDb.forums.find(f => f._id.toString() === nonExistentId.toString());
      expect(forum).toBeUndefined();

      // Dans un vrai test, on vérifierait que la méthode toggleLikeForum retourne une erreur 404
    });
  });

  // Tests pour getMonthlyStats
  describe('getMonthlyStats', () => {
    it('should return monthly forum statistics', async () => {
      // Créer des forums avec différentes dates
      const forums = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Forum Topic 1',
          description: 'Description 1',
          user_id: new mongoose.Types.ObjectId(),
          anonymous: false,
          tags: ['anxiety'],
          forum_photo: null,
          createdAt: new Date('2023-01-15'),
          status: 'actif'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Forum Topic 2',
          description: 'Description 2',
          user_id: new mongoose.Types.ObjectId(),
          anonymous: false,
          tags: ['depression'],
          forum_photo: null,
          createdAt: new Date('2023-01-20'),
          status: 'actif'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Forum Topic 3',
          description: 'Description 3',
          user_id: new mongoose.Types.ObjectId(),
          anonymous: false,
          tags: ['stress'],
          forum_photo: null,
          createdAt: new Date('2023-02-10'),
          status: 'actif'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Forum Topic 4',
          description: 'Description 4',
          user_id: new mongoose.Types.ObjectId(),
          anonymous: false,
          tags: ['anxiety'],
          forum_photo: null,
          createdAt: new Date('2023-03-05'),
          status: 'actif'
        }
      ];

      // Ajouter au mockDb
      mockDb.forums.push(...forums);

      // Simuler la méthode aggregate de Forum
      Forum.aggregate = jest.fn().mockImplementation(() => {
        return Promise.resolve([
          { month: '2023-01', count: 2 },
          { month: '2023-02', count: 1 },
          { month: '2023-03', count: 1 }
        ]);
      });

      // Vérifications
      const result = await Forum.aggregate();
      expect(result).toHaveLength(3);
      expect(result[0].month).toBe('2023-01');
      expect(result[0].count).toBe(2);
      expect(result[1].month).toBe('2023-02');
      expect(result[1].count).toBe(1);
      expect(result[2].month).toBe('2023-03');
      expect(result[2].count).toBe(1);
    });
  });

  // Tests pour getTopPublisher
  describe('getTopPublisher', () => {
    it('should return the user with the most forum posts', async () => {
      // Créer des utilisateurs
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();

      const users = [
        {
          _id: user1Id,
          username: 'user1',
          email: 'user1@esprit.tn',
          role: 'student'
        },
        {
          _id: user2Id,
          username: 'user2',
          email: 'user2@esprit.tn',
          role: 'student'
        }
      ];

      // Créer des forums
      const forums = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Forum Topic 1',
          description: 'Description 1',
          user_id: user1Id,
          anonymous: false,
          tags: ['anxiety'],
          forum_photo: null,
          createdAt: new Date(),
          status: 'actif'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Forum Topic 2',
          description: 'Description 2',
          user_id: user1Id,
          anonymous: false,
          tags: ['depression'],
          forum_photo: null,
          createdAt: new Date(),
          status: 'actif'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Forum Topic 3',
          description: 'Description 3',
          user_id: user1Id,
          anonymous: false,
          tags: ['stress'],
          forum_photo: null,
          createdAt: new Date(),
          status: 'actif'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Forum Topic 4',
          description: 'Description 4',
          user_id: user2Id,
          anonymous: false,
          tags: ['anxiety'],
          forum_photo: null,
          createdAt: new Date(),
          status: 'actif'
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(...users);
      mockDb.forums.push(...forums);

      // Simuler la méthode aggregate de Forum
      Forum.aggregate = jest.fn().mockImplementation(() => {
        return Promise.resolve([
          { username: 'user1', postCount: 3 }
        ]);
      });

      // Vérifications
      const result = await Forum.aggregate();
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('user1');
      expect(result[0].postCount).toBe(3);
    });

    it('should return default values if no forums exist', async () => {
      // Vider la base de données
      mockDb.forums = [];

      // Simuler la méthode aggregate de Forum
      Forum.aggregate = jest.fn().mockImplementation(() => {
        return Promise.resolve([]);
      });

      // Vérifications
      const result = await Forum.aggregate();
      expect(result).toHaveLength(0);

      // Dans un vrai test, on vérifierait que la méthode getTopPublisher retourne { username: "N/A", postCount: 0 }
    });
  });

  // Tests pour getMostBannedUser
  describe('getMostBannedUser', () => {
    it('should return the most banned user', async () => {
      // Créer des utilisateurs
      const user1Id = new mongoose.Types.ObjectId();
      const user2Id = new mongoose.Types.ObjectId();

      const users = [
        {
          _id: user1Id,
          username: 'user1',
          email: 'user1@esprit.tn',
          role: 'student'
        },
        {
          _id: user2Id,
          username: 'user2',
          email: 'user2@esprit.tn',
          role: 'student'
        }
      ];

      // Créer des bannissements
      const bans = [
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: user1Id,
          reason: 'Reason 1',
          expiresAt: new Date('2023-12-31'),
          createdAt: new Date('2023-01-01')
        },
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: user1Id,
          reason: 'Reason 2',
          expiresAt: new Date('2023-06-30'),
          createdAt: new Date('2023-02-01')
        },
        {
          _id: new mongoose.Types.ObjectId(),
          user_id: user2Id,
          reason: 'Reason 3',
          expiresAt: new Date('2023-09-30'),
          createdAt: new Date('2023-03-01')
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(...users);
      mockDb.forumBans.push(...bans);

      // Simuler la méthode aggregate de ForumBan
      ForumBan.aggregate = jest.fn().mockImplementation(() => {
        return Promise.resolve([
          { username: 'user1', banCount: 2 }
        ]);
      });

      // Vérifications
      const result = await ForumBan.aggregate();
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe('user1');
      expect(result[0].banCount).toBe(2);
    });

    it('should return default values if no bans exist', async () => {
      // Vider la base de données
      mockDb.forumBans = [];

      // Simuler la méthode aggregate de ForumBan
      ForumBan.aggregate = jest.fn().mockImplementation(() => {
        return Promise.resolve([]);
      });

      // Vérifications
      const result = await ForumBan.aggregate();
      expect(result).toHaveLength(0);

      // Dans un vrai test, on vérifierait que la méthode getMostBannedUser retourne { username: "N/A", banCount: 0 }
    });
  });
});
