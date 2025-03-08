const mongoose = require("mongoose");

const forumCommentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true }, // Contenu du commentaire
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Référence à l'utilisateur
    forum_id: { type: mongoose.Schema.Types.ObjectId, ref: "Forum", required: true }, // Référence au forum
    anonymous: { type: Boolean } 

  },
  {
    timestamps: true, 
  }
);

const ForumComment = mongoose.model("ForumComment", forumCommentSchema);

module.exports = ForumComment;
