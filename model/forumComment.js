const mongoose = require("mongoose");

const forumCommentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true }, 
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    forum_id: { type: mongoose.Schema.Types.ObjectId, ref: "Forum", required: true }, 
    anonymous: { type: Boolean } ,
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replies: [
      {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: false },
        anonymous: { type: Boolean, default: false },
        mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true, 
  }
);

const ForumComment = mongoose.model("ForumComment", forumCommentSchema);

module.exports = ForumComment;
