var express = require('express');
var router = express.Router();
const userController = require('../controller/userController');
const validate = require('../middleware/validate')


router.post('/addStudent',validate,userController.addStudent);
router.post('/login',userController.login);



module.exports = router;