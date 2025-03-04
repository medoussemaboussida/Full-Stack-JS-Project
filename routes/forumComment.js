const express = require("express");
const router = express.Router();
const forumCommentController = require("../controller/forumCommentController");

router.post("/addComment/:user_id/:forum_id", forumCommentController.addComment);
router.get("/getComment/:forum_id", forumCommentController.getComments);
router.put("/updateComment/:comment_id", forumCommentController.updateComment);
router.delete("/deleteComment/:comment_id", forumCommentController.deleteComment);

module.exports = router;
