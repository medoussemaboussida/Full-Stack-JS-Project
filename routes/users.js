var express = require('express');
var router = express.Router();
const userController = require('../controller/userController');
const validate = require('../middleware/validate')

router.post('/addStudent',validate,userController.addStudent);
router.post('/login',userController.login);
router.get('/session/:id',userController.Session);

router.get('/all',userController.getAllUsers);

router.put("/students/update/:id", userController.updateStudentProfile);  //updateStudent
router.get('/students/:id', userController.getStudentById);     // Récupérer un utilisateur par ID
router.delete('/delete/:id', userController.deleteStudentById);   // Supprimer un utilisateur
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);


router.post('/users/psychiatrists/availability', userController.addAvailability);
router.get('/psychiatrists', userController.getPsychiatristsWithAvailability);




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

// Ajouter une route pour gérer les utilisateurs authentifiés via Google
router.get('/google-user', (req, res) => {
  if (req.user) {
    // Retourner les informations de l'utilisateur authentifié via Google
    res.json(req.user);
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

router.get('/github-user', (req, res) => {
  if (req.user) {
      // Retourner les informations de l'utilisateur authentifié via Github
      res.json(req.user);
  } else {
      res.status(401).json({ message: "Not authenticated" });
  }
});

module.exports = router;