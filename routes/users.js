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



module.exports = router;