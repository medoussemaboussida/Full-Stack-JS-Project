var express = require('express');
var router = express.Router();
const userController = require('../controller/userController');
const activitiesController = require('../controller/activitiesController');
const validate = require('../middleware/validate')
const { updateStudentProfile, updateStudentPhoto } = require('../controller/userController');


//weather 
router.get('/weather', activitiesController.getweather);

router.put('/students/update/:id', updateStudentProfile);
router.put('/students/update-photo/:id', updateStudentPhoto);
router.post('/addStudent',validate,userController.addStudent);
router.post('/login',userController.login);
router.get('/session/:id',userController.Session);
router.get('/getStudentBytoken/:token', userController.getStudentBytoken);     // Récupérer un utilisateur par ID

router.get('/all',userController.getAllUsers);

router.put("/students/update/:id", userController.updateStudentProfile);  //updateStudent
router.get('/students/:id', userController.getStudentById);     // Récupérer un utilisateur par ID
router.delete('/delete/:id', userController.deleteStudentById);   // Supprimer un utilisateur
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);
router.post('/', userController.verifyToken, userController.addPublication);
router.get('/allPublication', userController.getAllPublications);
router.get('/myPublications', userController.verifyToken, userController.getMyPublications);
router.get('/publication/:id', userController.getPublicationById);
router.delete('/publication/:id', userController.verifyToken, userController.deletePublication);
router.patch('/publication/:publicationId', userController.updatePublicationStatus);
router.patch('/publication/update/:id', userController.verifyToken, userController.updatePublication);
router.post('/commentaire', userController.verifyToken, userController.addCommentaire);
router.get('/commentaires/:publicationId', userController.getCommentairesByPublication);
router.put('/commentaire/:commentId', userController.verifyToken, userController.updateCommentaire);
router.delete('/commentaire/:commentId', userController.verifyToken, userController.deleteCommentaire);
router.post('/publications/by-tags', userController.verifyToken, userController.getPublicationsByTags);
router.post('/publication/like/:publicationId', userController.verifyToken, userController.likePublication);
router.post('/publication/dislike/:publicationId', userController.verifyToken, userController.dislikePublication);
router.post('/publication/favorite/:publicationId', userController.verifyToken, userController.toggleFavorite);
router.get('/favoritePublications', userController.verifyToken, userController.getFavoritePublications);
router.get('/searchPublications', userController.searchPublications);
router.post('/publication/pin/:publicationId', userController.verifyToken, userController.togglePinPublication); // Nouvelle route pour épingler/désépingler
router.get('/pinnedPublications', userController.verifyToken, userController.getPinnedPublications); // Nouvelle route pour récupérer les épinglés
router.put('/update-receive-emails/:id', userController.verifyToken, userController.updateReceiveEmails); // Nouvelle route
router.post('/publication/report/:id', userController.verifyToken, userController.addReport);
router.get('/reports', userController.verifyToken, userController.getAllReports);
router.get('/publication/reports/:id', userController.verifyToken, userController.getReportsByPublication);
router.post('/comment/report/:commentId', userController.verifyToken, userController.addCommentReport);
router.get('/comment/reports', userController.verifyToken, userController.getAllCommentReports);
router.get('/comment/reports/:commentId', userController.verifyToken, userController.getReportsByComment);
router.delete('/deleteCommentAdmin/:commentId', userController.deleteCommentaireAdmin);
router.post('/ban/:userId', userController.verifyToken, userController.banUser);
router.get('/banned-users', userController.verifyToken, userController.getBannedUsers);
router.put('/unban/:userId', userController.verifyToken, userController.unbanUser);
router.get('/tags', userController.verifyToken , userController.getAllTags);
router.get('/recommendedPublications', userController.verifyToken, userController.getRecommendedPublications);



router.put("/psychiatrists/update-description/:id", userController.updatePsychiatristDescription);
router.get('/psychiatrists', userController.verifyToken, userController.getPsychiatrists);
router.put('/psychiatrists/add-availability/:id', userController.verifyToken, userController.addAvailability);
router.delete('/psychiatrists/delete-availability/:id/:index', userController.verifyToken, userController.deleteAvailability);
router.put('/psychiatrists/update-availability/:id/:index', userController.verifyToken, userController.updateAvailability);
router.post("/appointments/book", userController.verifyToken, userController.bookAppointment);
router.get('/appointments/history', userController.verifyToken, userController.getAppointmentHistory);
router.put('/appointments/:id', userController.verifyToken, userController.updateAppointment);
router.get('/psychiatrists/:id', userController.verifyToken, userController.getPsychiatristById);
router.put('/appointments/:appointmentId/status', userController.verifyToken, userController.updateAppointmentStatus);
router.delete('/appointments/:appointmentId', userController.verifyToken, userController.deleteAppointment);
router.get('/allAppointments', userController.getAllAppointments);
router.post('/chat', userController.verifyToken, userController.sendMessage);
router.post('/chat/:roomCode/public-key', userController.verifyToken, userController.sharePublicKey);
router.get('/chat/:roomCode/public-keys', userController.verifyToken, userController.getPublicKeys);
router.get('/chat/:roomCode', userController.verifyToken, userController.RoomChat);
router.get('/me', userController.verifyToken, userController.photo);
router.get('/allappoint', userController.getAllAppoint);
router.delete('/chat/:messageId', userController.verifyToken, userController.deletechat);
router.put('/chat/:messageId', userController.verifyToken, userController.updatechat);
router.get('/users/chat/rooms', userController.verifyToken, userController.getAllchat);
router.put('/notifications/:notificationId/read', userController.verifyToken, userController.markNotificationAsRead);
router.get('/notifications', userController.verifyToken, userController.getUserNotifications);
router.get('/appointments/psychiatrist/:psychiatristId',userController.verifyToken, userController.getAppointmentsByPsychiatrist);
router.post('/questionnaire/submit', userController.verifyToken, userController.submitQuestionnaire);












//ghassen
router.get("/categories" , userController.verifyToken, activitiesController.getAllCategories);
router.post("/categories/:id" , userController.verifyToken, activitiesController.createCategory);
router.put("/categories/:id", userController.verifyToken, activitiesController.updateCategory);
router.delete('/categories/:id',userController.verifyToken,  activitiesController.deleteCategory);  // Supprimer tous les utilisateurs

router.delete('/deleteAll', userController.deleteAllUsers);  // Supprimer tous les utilisateurs
router.get('/search', userController.searchUsers);  //Recherche User
router.post('/create', userController.createUser);  // Ajouter un utilisateur
router.get('/all', userController.getAllUsers);     // Récupérer tous les utilisateurs
router.get('/:id', userController.getUserById);     // Récupérer un utilisateur par ID
router.put('/:id', userController.updateUser);      // Mettre à jour un utilisateur
router.delete('/:id', userController.deleteUser);   // Supprimer un utilisateur
router.get("/verify/:token", userController.verifyUser);
router.put("/activate/:id", userController.activateAccount);
router.put("/deactivate/:id", userController.deactivateAccount);
router.put("/updateEtat/:id",userController.updateEtat);
router.get("/activate/:token", userController.activateUser); // Route pour activer un utilisateur via le lien envoyé par email
router.put("/updateEtat/:id", userController.updateEtat);  // Route pour modifier l'état d'un utilisateur manuellement
router.post("/logout", userController.logout);


// ✅ Ajouter une activité avec image
router.post("/psychiatrist/:id/add-activity", activitiesController.addActivity);

// ✅ Récupérer une activité par son ID
router.get("/activity/:id", activitiesController.getActivityById);

// ✅ Récupérer toutes les activités
router.get("/list/activities", activitiesController.getAllActivities);

// ✅ Modifier une activité (psychiatre et admin uniquement) avec image
router.put("/psychiatrist/:id/update-activity/:activityId", activitiesController.updateActivity);

// ✅ Récupérer les activités 
router.get("/psychiatrist/:id/activities", activitiesController.getPsychiatristActivities);

// ✅ Route pour récupérer les activités par catégorie
router.get("/activities/category", activitiesController.getActivitiesByCategory);

// ✅ Supprimer une activité (psychiatre et admin uniquement)
router.delete("/psychiatrist/:id/delete-activity/:activityId", activitiesController.deleteActivity);

router.put("/psychiatrist/:id/archive-activity/:activityId", activitiesController.archiveActivity);
// ✅ Récupérer les activités favorites d'un utilisateur
router.get("/favorite-activities/:id", activitiesController.getFavoriteActivities);

// ✅ Ajouter ou supprimer une activité des favoris
router.post("/favorite-activity/:id", activitiesController.toggleFavoriteActivity);

// ✅ Supprimer toutes les activités favorites
router.delete("/clear-favorite/:id", activitiesController.clearFavoriteActivities);

router.post('/generate-description', activitiesController.generateDescription);
router.post('/generate-title', activitiesController.generateTitle);


//schedule
// POST /users/schedule/:userId - Save or update scheduled activities
router.post("/schedule/:userId", userController.verifyToken, activitiesController.saveSchedule);

// GET /users/schedule/:userId - Retrieve scheduled activities
// routes/users.js (excerpt)
router.get("/schedule/:userId", userController.verifyToken, activitiesController.getSchedule);

// Nouvelles routes pour les humeurs
router.post("/moods/:userId", userController.verifyToken, activitiesController.saveMood);
router.get("/moods/:userId", userController.verifyToken, activitiesController.getMoods);

// Route to get the user's pinned activities
router.get("/pinned-activities/:userId", userController.verifyToken, activitiesController.getPinnedActivities);

// Route to toggle (pin/unpin) an activity
router.post("/pin-activity/:userId", userController.verifyToken, activitiesController.togglePinActivity);


router.post('/problems', userController.verifyToken, userController.createProblem);
router.get('/problems/:userId', userController.verifyToken, userController.getProblems);
router.put('/problems/:userId/:problemId', userController.verifyToken, userController.updateProblem);
router.delete('/problems/:userId/:problemId', userController.verifyToken, userController.deleteProblem);
//generate solution
router.post('/problems/:problemId/solution', userController.verifyToken, userController.generateSolution);
// Attendance routes
router.post(
    '/attendance/:userId',
    userController.verifyToken,
    userController.isTeacher,
    userController.createAttendanceSheet
);

router.get(
    '/attendance/:userId',
    userController.verifyToken,
    userController.isTeacher,
    userController.getAttendanceSheets
);

router.get(
    '/attendance/:userId/:sheetId',
    userController.verifyToken,
    userController.isTeacher,
    userController.getAttendanceSheetById
);

router.put(
    '/attendance/:userId/:sheetId',
    userController.verifyToken,
    userController.isTeacher,
    userController.updateAttendance
);

router.delete(
    '/attendance/:userId/:sheetId',
    userController.verifyToken,
    userController.isTeacher,
    userController.deleteAttendanceSheet
);

module.exports = router;

