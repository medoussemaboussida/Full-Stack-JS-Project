const express = require("express");
const router = express.Router();
const forumCommentController = require("../controller/forumCommentController");

router.post("/addComment/:user_id/:forum_id", forumCommentController.addComment);
router.get("/getComment/:forum_id", forumCommentController.getComments);
router.put("/updateComment/:comment_id", forumCommentController.updateComment);
router.delete("/deleteComment/:comment_id", forumCommentController.deleteComment);
router.post("/reportComment", forumCommentController.addReportComment);
router.get("/getCommentReports/:commentId", forumCommentController.getCommentReports);
router.delete("/reports/:reportId", forumCommentController.deleteCommentReport); 
router.post("/toggleLikeComment/:comment_id/:user_id", forumCommentController.toggleLikeComment);
router.get("/topCommenter", forumCommentController.getTopCommenter);

module.exports = router;
