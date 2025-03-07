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


router.get('/psychiatrists', userController.getPsychiatrists);
router.put('/psychiatrists/add-availability/:id', userController.addAvailability);
router.delete('/psychiatrists/delete-availability/:id/:index', userController.deleteAvailability);
router.put('/psychiatrists/update-availability/:id/:index', userController.updateAvailability);
router.post("/appointments/book", userController.verifyToken, userController.bookappointment);
router.get('/appointments/history', userController.verifyToken, userController.getAppointmentHistory);
router.put('/appointments/:appointmentId/status', userController.verifyToken, userController.updateAppointmentStatus);

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

// ✅ Récupérer les activités favorites d'un utilisateur
router.get("/favorite-activities/:id", activitiesController.getFavoriteActivities);

// ✅ Ajouter ou supprimer une activité des favoris
router.post("/favorite-activity/:id", activitiesController.toggleFavoriteActivity);

// ✅ Supprimer toutes les activités favorites
router.delete("/clear-favorite/:id", activitiesController.clearFavoriteActivities);




module.exports = router;