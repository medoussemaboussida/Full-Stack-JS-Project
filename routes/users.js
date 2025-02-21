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
router.delete('/students/delete/:id', userController.deleteStudentById);   // Supprimer un utilisateur
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password/:token', userController.resetPassword);

// Ajouter une route pour gérer les utilisateurs authentifiés via Google
router.get('/google-user', (req, res) => {
    if (req.user) {
      // Retourner les informations de l'utilisateur authentifié via Google
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });


module.exports = router;