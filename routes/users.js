var express = require('express');
var router = express.Router();
const userController = require('../controller/userController');
const activitiesController = require('../controller/activitiesController');

const validate = require('../middleware/validate')
const { updateStudentProfile, updateStudentPhoto } = require('../controller/userController');

router.put('/students/update/:id', updateStudentProfile);
router.put('/students/update-photo/:id', updateStudentPhoto);
router.post('/addStudent',validate,userController.addStudent);
router.post('/login',userController.login);
router.get('/session/:id',userController.Session);

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




router.get('/psychiatrists', userController.getPsychiatrists);
router.put('/psychiatrists/add-availability/:id', userController.addAvailability);
router.delete('/psychiatrists/delete-availability/:id/:index', userController.deleteAvailability);
router.put('/psychiatrists/update-availability/:id/:index', userController.updateAvailability);
router.post("/appointments/book", userController.verifyToken, userController.bookappointment);
router.get('/appointments/history', userController.verifyToken, userController.getAppointmentHistory);
router.put('/appointments/:appointmentId/status', userController.verifyToken, userController.updateAppointmentStatus);
router.delete('/appointments/:appointmentId', userController.verifyToken, userController.deleteAppointment);
router.get('/allAppointments', userController.getAllAppointments);
router.get("/chat/:roomCode", userController.verifyToken, userController.RoomChat);
router.post("/chat", userController.verifyToken, userController.Chat);








//ghassen
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




// ✅ Récupérer toutes les activités
router.get("/list/activities", activitiesController.getAllActivities);

// ✅ Récupérer les activités favorites d'un utilisateur
router.get("/favorite-activities/:id", activitiesController.getFavoriteActivities);

// ✅ Ajouter ou supprimer une activité des favoris
router.post("/favorite-activity/:id", activitiesController.toggleFavoriteActivity);

// ✅ Supprimer toutes les activités favorites
router.delete("/clear-favorite/:id", activitiesController.clearFavoriteActivities);

// ✅ Ajouter une activité (psychiatre uniquement) avec image
router.post("/psychiatrist/:id/add-activity", activitiesController.addActivity);

// ✅ Modifier une activité (psychiatre uniquement) avec image
router.put("/psychiatrist/:id/update-activity/:activityId", activitiesController.updateActivity);


// ✅ Supprimer une activité (psychiatre uniquement)
router.delete("/psychiatrist/:id/delete-activity/:activityId", activitiesController.deleteActivity);

// ✅ Récupérer les activités d'un psychiatre spécifique
router.get("/psychiatrist/:id/activities", activitiesController.getPsychiatristActivities);



module.exports = router;