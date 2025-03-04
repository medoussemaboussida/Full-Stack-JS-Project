var express = require('express');
var router = express.Router();
const forumController = require('../controller/forumController');

router.post('/addForum',forumController.addForum);
router.get('/getForum',forumController.getForum);
router.put('/updateForum/:forum_id',forumController.updateForum);
router.delete('/deleteForum/:forum_id',forumController.deleteForum);


module.exports = router;