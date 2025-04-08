var express = require('express');
var router = express.Router();
const forumController = require('../controller/forumController');
const upload = require("../middleware/uploadFile");
const { validateForumTopic } = require("../middleware/validateForum"); 

router.post('/addForum/:user_id',upload.single("forum_photo"),validateForumTopic,forumController.addForum);
router.get('/getForum',forumController.getForum);
router.put('/updateForum/:forum_id',upload.single("forum_photo"),forumController.updateForum);
router.delete('/deleteForum/:forum_id',forumController.deleteForum);
router.post("/reportForum", forumController.addReportForum);
router.get("/getForumReports/:forumId", forumController.getForumReports);
router.delete("/reports/:reportId", forumController.deleteForumReport); 
router.put('/changeStatus/:forum_id', forumController.changeForumStatus);
router.post("/ban", forumController.banUser); //ban
router.delete("/unban/:banId", forumController.unbanUser); //delete ban
router.get("/banned-users", forumController.getBannedUsers); //list of all banned users
router.get("/checkBan/:userId", forumController.checkBan); //ban of a user
router.post("/togglePinForum/:forum_id/:user_id", forumController.togglePinForum); 
router.post("/toggleLikeForum/:forum_id/:user_id", forumController.toggleLikeForum); 
router.get("/stats", forumController.getForumStats);
router.get("/monthlyStats", forumController.getMonthlyStats);
router.get("/topPublisher", forumController.getTopPublisher);
router.get("/mostBannedUser", forumController.getMostBannedUser);
module.exports = router;