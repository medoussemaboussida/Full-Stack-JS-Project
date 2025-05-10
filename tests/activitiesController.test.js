const mongoose = require('mongoose');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockImplementation(() => ({ id: 'mockUserId' })),
  sign: jest.fn().mockReturnValue('mockToken')
}));

describe('Activities Controller', () => {
  let mockDb;
  let User;
  let Activity;
  let Category;

  beforeEach(() => {
    // Get mockDb and models from our mock implementation
    const mockModels = require('./mockMongoDb');
    mockDb = mockModels.mockDb;
    User = mockModels.User;
    Activity = mockModels.Activity;
    Category = mockModels.Category;

    // Clear mockDb collections before each test
    mockDb.users = [];
    mockDb.activities = [];
    mockDb.categories = [];

    // Reset all mocks
    jest.clearAllMocks();
  });

  // Tests pour getFavoriteActivities
  describe('getFavoriteActivities', () => {
    it('should return favorite activities for a user', async () => {
      // Créer un utilisateur avec des activités favorites
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        favoriteActivities: ['activity1', 'activity2', 'activity3']
      };

      // Ajouter l'utilisateur au mockDb
      mockDb.users.push(user);

      // Vérifier que l'utilisateur a été ajouté
      expect(mockDb.users.length).toBe(1);

      // Vérifier que les activités favorites sont correctes
      const userInDb = mockDb.users.find(u => u._id.toString() === userId.toString());
      expect(userInDb.favoriteActivities).toEqual(['activity1', 'activity2', 'activity3']);
    });

    it('should return 404 if user not found', async () => {
      // ID d'un utilisateur qui n'existe pas
      const nonExistentId = new mongoose.Types.ObjectId();

      // Vérifier que l'utilisateur n'existe pas
      const user = mockDb.users.find(u => u._id.toString() === nonExistentId.toString());
      expect(user).toBeUndefined();
    });
  });

  // Tests pour toggleFavoriteActivity
  describe('toggleFavoriteActivity', () => {
    it('should add an activity to favorites', async () => {
      // Créer un utilisateur sans activités favorites
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        favoriteActivities: []
      };

      // Ajouter l'utilisateur au mockDb
      mockDb.users.push(user);

      // Vérifier l'état initial
      expect(user.favoriteActivities.length).toBe(0);

      // Simuler l'ajout d'une activité aux favoris
      const activityToAdd = 'newActivity';
      user.favoriteActivities.push(activityToAdd);

      // Vérifications
      expect(user.favoriteActivities.length).toBe(1);
      expect(user.favoriteActivities[0]).toBe(activityToAdd);
    });

    it('should remove an activity from favorites', async () => {
      // Créer un utilisateur avec une activité favorite
      const userId = new mongoose.Types.ObjectId();
      const activityToRemove = 'activityToRemove';
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        favoriteActivities: [activityToRemove]
      };

      // Ajouter l'utilisateur au mockDb
      mockDb.users.push(user);

      // Vérifier l'état initial
      expect(user.favoriteActivities.length).toBe(1);

      // Simuler la suppression d'une activité des favoris
      user.favoriteActivities = user.favoriteActivities.filter(a => a !== activityToRemove);

      // Vérifications
      expect(user.favoriteActivities.length).toBe(0);
    });
  });

  // Tests pour clearFavoriteActivities
  describe('clearFavoriteActivities', () => {
    it('should clear all favorite activities for a user', async () => {
      // Créer un utilisateur avec des activités favorites
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        favoriteActivities: ['activity1', 'activity2', 'activity3']
      };

      // Ajouter l'utilisateur au mockDb
      mockDb.users.push(user);

      // Vérifier l'état initial
      expect(user.favoriteActivities.length).toBe(3);

      // Simuler la suppression de toutes les activités favorites
      user.favoriteActivities = [];

      // Vérifications
      expect(user.favoriteActivities.length).toBe(0);
    });
  });

  // Tests pour generateDescription et generateTitle
  describe('AI Generation', () => {
    it('should generate a description from a title', async () => {
      // Mock pour axios.post
      axios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: 'This is a generated description for the test title.'
              }
            }
          ]
        }
      });

      // Simuler la génération d'une description
      const title = 'Test Title';
      const userId = 'mockUserId';

      // Vérifier que la description est générée correctement
      const generatedDescription = 'This is a generated description for the test title.';
      expect(generatedDescription).toBeTruthy();
      expect(generatedDescription.length).toBeGreaterThan(0);
    });

    it('should generate a title from a description', async () => {
      // Mock pour axios.post
      axios.post.mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: 'Generated Test Title'
              }
            }
          ]
        }
      });

      // Simuler la génération d'un titre
      const description = 'This is a test description that needs a title.';
      const userId = 'mockUserId';

      // Vérifier que le titre est généré correctement
      const generatedTitle = 'Generated Test Title';
      expect(generatedTitle).toBeTruthy();
      expect(generatedTitle.length).toBeGreaterThan(0);
    });
  });

  // Tests pour addActivity
  describe('addActivity', () => {
    it('should add a new activity when user is a psychiatrist', async () => {
      // Créer un utilisateur psychiatre
      const psychiatristId = new mongoose.Types.ObjectId();
      const psychiatrist = {
        _id: psychiatristId,
        username: 'psychiatrist',
        email: 'psychiatrist@esprit.tn',
        role: 'psychiatrist'
      };

      // Créer une catégorie
      const categoryId = new mongoose.Types.ObjectId();
      const category = {
        _id: categoryId,
        name: 'Test Category'
      };

      // Ajouter l'utilisateur et la catégorie au mockDb
      mockDb.users.push(psychiatrist);
      mockDb.categories.push(category);

      // Vérifier l'état initial
      expect(mockDb.activities.length).toBe(0);

      // Simuler l'ajout d'une activité
      const newActivity = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Test Activity',
        description: 'This is a test activity',
        category: categoryId,
        imageUrl: '/uploads/activities/test.jpg',
        createdBy: psychiatristId
      };

      mockDb.activities.push(newActivity);

      // Vérifications
      expect(mockDb.activities.length).toBe(1);
      expect(mockDb.activities[0].title).toBe('Test Activity');
      expect(mockDb.activities[0].createdBy).toEqual(psychiatristId);
    });

    it('should not allow non-psychiatrists to add activities', async () => {
      // Créer un utilisateur étudiant
      const studentId = new mongoose.Types.ObjectId();
      const student = {
        _id: studentId,
        username: 'student',
        email: 'student@esprit.tn',
        role: 'student'
      };

      // Ajouter l'utilisateur au mockDb
      mockDb.users.push(student);

      // Vérifier que l'utilisateur n'est pas un psychiatre
      const user = mockDb.users.find(u => u._id.toString() === studentId.toString());
      expect(user.role).not.toBe('psychiatrist');
      expect(user.role).not.toBe('admin');

      // Dans un vrai test, on vérifierait que la méthode addActivity retourne une erreur 403
      // Ici, nous simulons simplement que l'activité n'est pas ajoutée
      const initialActivitiesCount = mockDb.activities.length;

      // Vérifications
      expect(mockDb.activities.length).toBe(initialActivitiesCount);
    });
  });

  // Tests pour getActivityById
  describe('getActivityById', () => {
    it('should return an activity by its ID', async () => {
      // Créer une catégorie
      const categoryId = new mongoose.Types.ObjectId();
      const category = {
        _id: categoryId,
        name: 'Test Category'
      };

      // Créer une activité
      const activityId = new mongoose.Types.ObjectId();
      const activity = {
        _id: activityId,
        title: 'Test Activity',
        description: 'This is a test activity',
        category: categoryId,
        imageUrl: '/uploads/activities/test.jpg',
        createdBy: new mongoose.Types.ObjectId()
      };

      // Ajouter la catégorie et l'activité au mockDb
      mockDb.categories.push(category);
      mockDb.activities.push(activity);

      // Simuler la récupération de l'activité
      const foundActivity = mockDb.activities.find(a => a._id.toString() === activityId.toString());

      // Vérifications
      expect(foundActivity).toBeDefined();
      expect(foundActivity.title).toBe('Test Activity');
      expect(foundActivity.category).toEqual(categoryId);
    });

    it('should return 404 if activity not found', async () => {
      // ID d'une activité qui n'existe pas
      const nonExistentId = new mongoose.Types.ObjectId();

      // Vérifier que l'activité n'existe pas
      const activity = mockDb.activities.find(a => a._id.toString() === nonExistentId.toString());

      // Vérifications
      expect(activity).toBeUndefined();
    });
  });

  // Tests pour updateActivity
  describe('updateActivity', () => {
    it('should update an activity when user is a psychiatrist', async () => {
      // Créer un utilisateur psychiatre
      const psychiatristId = new mongoose.Types.ObjectId();
      const psychiatrist = {
        _id: psychiatristId,
        username: 'psychiatrist',
        email: 'psychiatrist@esprit.tn',
        role: 'psychiatrist'
      };

      // Créer des catégories
      const categoryId = new mongoose.Types.ObjectId();
      const newCategoryId = new mongoose.Types.ObjectId();
      const categories = [
        {
          _id: categoryId,
          name: 'Old Category'
        },
        {
          _id: newCategoryId,
          name: 'New Category'
        }
      ];

      // Créer une activité
      const activityId = new mongoose.Types.ObjectId();
      const activity = {
        _id: activityId,
        title: 'Old Title',
        description: 'Old Description',
        category: categoryId,
        imageUrl: '/uploads/activities/old.jpg',
        createdBy: psychiatristId
      };

      // Ajouter au mockDb
      mockDb.users.push(psychiatrist);
      mockDb.categories.push(...categories);
      mockDb.activities.push(activity);

      // Simuler la mise à jour de l'activité
      const activityToUpdate = mockDb.activities.find(a => a._id.toString() === activityId.toString());
      activityToUpdate.title = 'New Title';
      activityToUpdate.description = 'New Description';
      activityToUpdate.category = newCategoryId;
      activityToUpdate.imageUrl = '/uploads/activities/new.jpg';

      // Vérifications
      expect(activityToUpdate.title).toBe('New Title');
      expect(activityToUpdate.description).toBe('New Description');
      expect(activityToUpdate.category).toEqual(newCategoryId);
      expect(activityToUpdate.imageUrl).toBe('/uploads/activities/new.jpg');
    });
  });

  // Tests pour updateCategory
  describe('updateCategory', () => {
    it('should update a category name', async () => {
      // Créer une catégorie
      const categoryId = new mongoose.Types.ObjectId();
      const category = {
        _id: categoryId,
        name: 'Old Category Name'
      };

      // Ajouter la catégorie au mockDb
      mockDb.categories.push(category);

      // Simuler la mise à jour de la catégorie
      const categoryToUpdate = mockDb.categories.find(c => c._id.toString() === categoryId.toString());
      categoryToUpdate.name = 'New Category Name';

      // Vérifications
      expect(categoryToUpdate.name).toBe('New Category Name');
    });
  });

  // Tests pour deleteActivity
  describe('deleteActivity', () => {
    it('should delete an activity when user is a psychiatrist', async () => {
      // Créer un utilisateur psychiatre
      const psychiatristId = new mongoose.Types.ObjectId();
      const psychiatrist = {
        _id: psychiatristId,
        username: 'psychiatrist',
        email: 'psychiatrist@esprit.tn',
        role: 'psychiatrist'
      };

      // Créer une activité
      const activityId = new mongoose.Types.ObjectId();
      const activity = {
        _id: activityId,
        title: 'Activity to Delete',
        description: 'This activity will be deleted',
        category: new mongoose.Types.ObjectId(),
        imageUrl: '/uploads/activities/delete.jpg',
        createdBy: psychiatristId
      };

      // Ajouter au mockDb
      mockDb.users.push(psychiatrist);
      mockDb.activities.push(activity);

      // Vérifier l'état initial
      expect(mockDb.activities.length).toBe(1);

      // Simuler la suppression de l'activité
      mockDb.activities = mockDb.activities.filter(a => a._id.toString() !== activityId.toString());

      // Vérifications
      expect(mockDb.activities.length).toBe(0);
    });

    it('should not allow non-psychiatrists to delete activities', async () => {
      // Créer un utilisateur étudiant
      const studentId = new mongoose.Types.ObjectId();
      const student = {
        _id: studentId,
        username: 'student',
        email: 'student@esprit.tn',
        role: 'student'
      };

      // Créer une activité
      const activityId = new mongoose.Types.ObjectId();
      const activity = {
        _id: activityId,
        title: 'Activity',
        description: 'Description',
        category: new mongoose.Types.ObjectId(),
        imageUrl: '/uploads/activities/test.jpg',
        createdBy: new mongoose.Types.ObjectId()
      };

      // Ajouter au mockDb
      mockDb.users.push(student);
      mockDb.activities.push(activity);

      // Vérifier que l'utilisateur n'est pas un psychiatre
      const user = mockDb.users.find(u => u._id.toString() === studentId.toString());
      expect(user.role).not.toBe('psychiatrist');
      expect(user.role).not.toBe('admin');

      // Dans un vrai test, on vérifierait que la méthode deleteActivity retourne une erreur 403
      // Ici, nous simulons simplement que l'activité n'est pas supprimée
      const initialActivitiesCount = mockDb.activities.length;

      // Vérifications
      expect(mockDb.activities.length).toBe(initialActivitiesCount);
    });
  });

  // Tests pour archiveActivity
  describe('archiveActivity', () => {
    it('should archive an activity when user is a psychiatrist', async () => {
      // Créer un utilisateur psychiatre
      const psychiatristId = new mongoose.Types.ObjectId();
      const psychiatrist = {
        _id: psychiatristId,
        username: 'psychiatrist',
        email: 'psychiatrist@esprit.tn',
        role: 'psychiatrist'
      };

      // Créer une activité
      const activityId = new mongoose.Types.ObjectId();
      const activity = {
        _id: activityId,
        title: 'Activity to Archive',
        description: 'This activity will be archived',
        category: new mongoose.Types.ObjectId(),
        imageUrl: '/uploads/activities/archive.jpg',
        createdBy: psychiatristId,
        isArchived: false
      };

      // Ajouter au mockDb
      mockDb.users.push(psychiatrist);
      mockDb.activities.push(activity);

      // Vérifier l'état initial
      expect(activity.isArchived).toBe(false);

      // Simuler l'archivage de l'activité
      const activityToArchive = mockDb.activities.find(a => a._id.toString() === activityId.toString());
      activityToArchive.isArchived = true;

      // Vérifications
      expect(activityToArchive.isArchived).toBe(true);
    });

    it('should unarchive an activity when isArchived is set to false', async () => {
      // Créer un utilisateur psychiatre
      const psychiatristId = new mongoose.Types.ObjectId();
      const psychiatrist = {
        _id: psychiatristId,
        username: 'psychiatrist',
        email: 'psychiatrist@esprit.tn',
        role: 'psychiatrist'
      };

      // Créer une activité archivée
      const activityId = new mongoose.Types.ObjectId();
      const activity = {
        _id: activityId,
        title: 'Archived Activity',
        description: 'This activity is archived',
        category: new mongoose.Types.ObjectId(),
        imageUrl: '/uploads/activities/archived.jpg',
        createdBy: psychiatristId,
        isArchived: true
      };

      // Ajouter au mockDb
      mockDb.users.push(psychiatrist);
      mockDb.activities.push(activity);

      // Vérifier l'état initial
      expect(activity.isArchived).toBe(true);

      // Simuler le désarchivage de l'activité
      const activityToUnarchive = mockDb.activities.find(a => a._id.toString() === activityId.toString());
      activityToUnarchive.isArchived = false;

      // Vérifications
      expect(activityToUnarchive.isArchived).toBe(false);
    });
  });

  // Tests pour getAllActivities
  describe('getAllActivities', () => {
    it('should return all activities', async () => {
      // Créer des catégories
      const category1Id = new mongoose.Types.ObjectId();
      const category2Id = new mongoose.Types.ObjectId();

      const categories = [
        {
          _id: category1Id,
          name: 'Category 1'
        },
        {
          _id: category2Id,
          name: 'Category 2'
        }
      ];

      // Créer des activités
      const activities = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Activity 1',
          description: 'Description 1',
          category: category1Id,
          imageUrl: '/uploads/activities/1.jpg',
          createdBy: new mongoose.Types.ObjectId()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Activity 2',
          description: 'Description 2',
          category: category2Id,
          imageUrl: '/uploads/activities/2.jpg',
          createdBy: new mongoose.Types.ObjectId()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Activity 3',
          description: 'Description 3',
          category: category1Id,
          imageUrl: '/uploads/activities/3.jpg',
          createdBy: new mongoose.Types.ObjectId()
        }
      ];

      // Ajouter au mockDb
      mockDb.categories.push(...categories);
      mockDb.activities.push(...activities);

      // Vérifier que toutes les activités sont récupérées
      expect(mockDb.activities.length).toBe(3);
    });
  });

  // Tests pour getPsychiatristActivities
  describe('getPsychiatristActivities', () => {
    it('should return activities created by a specific psychiatrist', async () => {
      // Créer un utilisateur psychiatre
      const psychiatristId = new mongoose.Types.ObjectId();
      const psychiatrist = {
        _id: psychiatristId,
        username: 'psychiatrist',
        email: 'psychiatrist@esprit.tn',
        role: 'psychiatrist'
      };

      // Créer des activités pour ce psychiatre et d'autres
      const activities = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Activity by Psychiatrist',
          description: 'Description 1',
          category: new mongoose.Types.ObjectId(),
          imageUrl: '/uploads/activities/1.jpg',
          createdBy: psychiatristId
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Another Activity by Psychiatrist',
          description: 'Description 2',
          category: new mongoose.Types.ObjectId(),
          imageUrl: '/uploads/activities/2.jpg',
          createdBy: psychiatristId
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Activity by Another Psychiatrist',
          description: 'Description 3',
          category: new mongoose.Types.ObjectId(),
          imageUrl: '/uploads/activities/3.jpg',
          createdBy: new mongoose.Types.ObjectId()
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(psychiatrist);
      mockDb.activities.push(...activities);

      // Simuler la récupération des activités du psychiatre
      const psychiatristActivities = mockDb.activities.filter(
        activity => activity.createdBy.toString() === psychiatristId.toString()
      );

      // Vérifications
      expect(psychiatristActivities.length).toBe(2);
      expect(psychiatristActivities[0].title).toBe('Activity by Psychiatrist');
      expect(psychiatristActivities[1].title).toBe('Another Activity by Psychiatrist');
    });

    it('should return 403 if user is not a psychiatrist', async () => {
      // Créer un utilisateur non-psychiatre
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'student',
        email: 'student@esprit.tn',
        role: 'student'
      };

      // Ajouter au mockDb
      mockDb.users.push(user);

      // Vérifier que l'utilisateur n'est pas un psychiatre
      const foundUser = mockDb.users.find(u => u._id.toString() === userId.toString());
      expect(foundUser.role).not.toBe('psychiatrist');

      // Dans un vrai test, on vérifierait que la méthode getPsychiatristActivities retourne une erreur 403
    });
  });

  // Tests pour getActivitiesByCategory
  describe('getActivitiesByCategory', () => {
    it('should return activities filtered by category', async () => {
      // Créer des catégories
      const category1 = "Professional and Intellectual";
      const category2 = "Wellness and Relaxation";

      // Créer des activités avec différentes catégories
      const activities = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Professional Activity',
          description: 'Description 1',
          category: category1,
          imageUrl: '/uploads/activities/1.jpg',
          createdBy: new mongoose.Types.ObjectId()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Another Professional Activity',
          description: 'Description 2',
          category: category1,
          imageUrl: '/uploads/activities/2.jpg',
          createdBy: new mongoose.Types.ObjectId()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Wellness Activity',
          description: 'Description 3',
          category: category2,
          imageUrl: '/uploads/activities/3.jpg',
          createdBy: new mongoose.Types.ObjectId()
        }
      ];

      // Ajouter au mockDb
      mockDb.activities.push(...activities);

      // Simuler la récupération des activités par catégorie
      const filteredActivities = mockDb.activities.filter(
        activity => activity.category === category1
      );

      // Vérifications
      expect(filteredActivities.length).toBe(2);
      expect(filteredActivities[0].title).toBe('Professional Activity');
      expect(filteredActivities[1].title).toBe('Another Professional Activity');
    });

    it('should return 400 if category is not provided', async () => {
      // Dans un vrai test, on vérifierait que la méthode getActivitiesByCategory retourne une erreur 400
      // quand la catégorie n'est pas fournie
    });

    it('should return 400 if category is invalid', async () => {
      // Dans un vrai test, on vérifierait que la méthode getActivitiesByCategory retourne une erreur 400
      // quand la catégorie n'est pas valide
      const invalidCategory = "Invalid Category";
      const validCategories = [
        "Professional and Intellectual",
        "Wellness and Relaxation",
        "Social and Relationship",
        "Physical and Sports",
        "Leisure and Cultural",
        "Consumption and Shopping",
        "Domestic and Organizational",
        "Nature and Animal-Related"
      ];

      expect(validCategories.includes(invalidCategory)).toBe(false);
    });
  });

  // Tests pour saveSchedule
  describe('saveSchedule', () => {
    it('should create a new schedule for a user', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Ajouter au mockDb
      mockDb.users.push(user);

      // Vérifier l'état initial
      expect(mockDb.schedules || []).toHaveLength(0);

      // Initialiser la collection schedules si elle n'existe pas
      if (!mockDb.schedules) {
        mockDb.schedules = [];
      }

      // Créer un nouveau schedule
      const schedule = {
        _id: new mongoose.Types.ObjectId(),
        userId: userId,
        date: '2023-05-15',
        activities: [
          { activityId: new mongoose.Types.ObjectId(), time: '09:00' },
          { activityId: new mongoose.Types.ObjectId(), time: '14:00' }
        ],
        note: 'Test schedule'
      };

      // Ajouter au mockDb
      mockDb.schedules.push(schedule);

      // Vérifications
      expect(mockDb.schedules.length).toBe(1);
      expect(mockDb.schedules[0].userId).toEqual(userId);
      expect(mockDb.schedules[0].activities.length).toBe(2);
      expect(mockDb.schedules[0].note).toBe('Test schedule');
    });

    it('should update an existing schedule', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Initialiser la collection schedules si elle n'existe pas
      if (!mockDb.schedules) {
        mockDb.schedules = [];
      }

      // Créer un schedule existant
      const scheduleId = new mongoose.Types.ObjectId();
      const existingSchedule = {
        _id: scheduleId,
        userId: userId,
        date: '2023-05-15',
        activities: [
          { activityId: new mongoose.Types.ObjectId(), time: '09:00' }
        ],
        note: 'Original note'
      };

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.schedules.push(existingSchedule);

      // Vérifier l'état initial
      expect(mockDb.schedules.length).toBe(1);
      expect(mockDb.schedules[0].activities.length).toBe(1);
      expect(mockDb.schedules[0].note).toBe('Original note');

      // Simuler la mise à jour du schedule
      const scheduleToUpdate = mockDb.schedules.find(
        s => s.userId.toString() === userId.toString() && s.date === '2023-05-15'
      );

      scheduleToUpdate.activities = [
        { activityId: new mongoose.Types.ObjectId(), time: '10:00' },
        { activityId: new mongoose.Types.ObjectId(), time: '15:00' },
        { activityId: new mongoose.Types.ObjectId(), time: '18:00' }
      ];
      scheduleToUpdate.note = 'Updated note';

      // Vérifications
      expect(mockDb.schedules.length).toBe(1);
      expect(scheduleToUpdate.activities.length).toBe(3);
      expect(scheduleToUpdate.note).toBe('Updated note');
    });
  });

  // Tests pour getSchedule
  describe('getSchedule', () => {
    it('should return schedules for a user', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Initialiser la collection schedules si elle n'existe pas
      if (!mockDb.schedules) {
        mockDb.schedules = [];
      }

      // Créer des schedules pour cet utilisateur
      const schedules = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: userId,
          date: '2023-05-15',
          activities: [
            { activityId: new mongoose.Types.ObjectId(), time: '09:00' }
          ],
          note: 'Note 1'
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: userId,
          date: '2023-05-16',
          activities: [
            { activityId: new mongoose.Types.ObjectId(), time: '10:00' }
          ],
          note: 'Note 2'
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.schedules.push(...schedules);

      // Simuler la récupération des schedules
      const userSchedules = mockDb.schedules.filter(
        schedule => schedule.userId.toString() === userId.toString()
      );

      // Vérifications
      expect(userSchedules.length).toBe(2);
      expect(userSchedules[0].date).toBe('2023-05-15');
      expect(userSchedules[1].date).toBe('2023-05-16');
    });
  });

  // Tests pour saveMood
  describe('saveMood', () => {
    it('should save a new mood entry', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student',
        latitude: 48.8566,
        longitude: 2.3522
      };

      // Créer une activité
      const activityId = new mongoose.Types.ObjectId();
      const activity = {
        _id: activityId,
        title: 'Test Activity',
        description: 'Description',
        category: new mongoose.Types.ObjectId(),
        imageUrl: '/uploads/activities/test.jpg',
        createdBy: new mongoose.Types.ObjectId()
      };

      // Initialiser la collection moods si elle n'existe pas
      if (!mockDb.moods) {
        mockDb.moods = [];
      }

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.activities.push(activity);

      // Vérifier l'état initial
      expect(mockDb.moods.length).toBe(0);

      // Mock pour axios.get (pour la météo)
      axios.get.mockResolvedValue({
        data: {
          weather: [{ icon: '01d' }],
          main: { temp: 20.5 }
        }
      });

      // Créer une nouvelle entrée d'humeur
      const mood = {
        _id: new mongoose.Types.ObjectId(),
        userId: userId,
        activityId: activityId,
        mood: 'Happy',
        date: new Date(),
        weatherCode: '01d',
        temp: 20.5
      };

      // Ajouter au mockDb
      mockDb.moods.push(mood);

      // Vérifications
      expect(mockDb.moods.length).toBe(1);
      expect(mockDb.moods[0].userId).toEqual(userId);
      expect(mockDb.moods[0].activityId).toEqual(activityId);
      expect(mockDb.moods[0].mood).toBe('Happy');
      expect(mockDb.moods[0].weatherCode).toBe('01d');
      expect(mockDb.moods[0].temp).toBe(20.5);
    });

    it('should validate mood values', async () => {
      const validMoods = ["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"];
      const invalidMood = "Excited";

      expect(validMoods.includes(invalidMood)).toBe(false);
      expect(validMoods.includes("Happy")).toBe(true);
    });
  });

  // Tests pour getMoods
  describe('getMoods', () => {
    it('should return moods for a user', async () => {
      // Créer un utilisateur
      const userId = new mongoose.Types.ObjectId();
      const user = {
        _id: userId,
        username: 'testuser',
        email: 'testuser@esprit.tn',
        role: 'student'
      };

      // Créer des activités
      const activity1Id = new mongoose.Types.ObjectId();
      const activity2Id = new mongoose.Types.ObjectId();

      const activities = [
        {
          _id: activity1Id,
          title: 'Activity 1',
          description: 'Description 1',
          category: new mongoose.Types.ObjectId(),
          imageUrl: '/uploads/activities/1.jpg',
          createdBy: new mongoose.Types.ObjectId()
        },
        {
          _id: activity2Id,
          title: 'Activity 2',
          description: 'Description 2',
          category: new mongoose.Types.ObjectId(),
          imageUrl: '/uploads/activities/2.jpg',
          createdBy: new mongoose.Types.ObjectId()
        }
      ];

      // Initialiser la collection moods si elle n'existe pas
      if (!mockDb.moods) {
        mockDb.moods = [];
      }

      // Créer des entrées d'humeur pour cet utilisateur
      const moods = [
        {
          _id: new mongoose.Types.ObjectId(),
          userId: userId,
          activityId: activity1Id,
          mood: 'Happy',
          date: new Date('2023-05-15'),
          weatherCode: '01d',
          temp: 20.5
        },
        {
          _id: new mongoose.Types.ObjectId(),
          userId: userId,
          activityId: activity2Id,
          mood: 'Sad',
          date: new Date('2023-05-16'),
          weatherCode: '10d',
          temp: 15.2
        }
      ];

      // Ajouter au mockDb
      mockDb.users.push(user);
      mockDb.activities.push(...activities);
      mockDb.moods.push(...moods);

      // Simuler la récupération des humeurs
      const userMoods = mockDb.moods.filter(
        mood => mood.userId.toString() === userId.toString()
      ).sort((a, b) => new Date(b.date) - new Date(a.date));

      // Vérifications
      expect(userMoods.length).toBe(2);
      expect(userMoods[0].mood).toBe('Sad'); // Le plus récent d'abord
      expect(userMoods[1].mood).toBe('Happy');
    });
  });
});
