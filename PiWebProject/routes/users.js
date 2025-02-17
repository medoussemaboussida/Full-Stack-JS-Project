var express = require('express');
var router = express.Router();
const userController = require('../controller/userController');
router.post('/addUser',userController.addUser);
router.post('/login',userController.login);
module.exports = router;