const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    forum_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Forum", 
      required: false, 
      default: null,
    },
    comment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ForumComment", 
      required: false, 
      default: null,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true, 
    },
    reason: {
      type: String,
      enum: [
        "inappropriate_content",
        "spam",
        "harassment",
        "offensive_language",
        "misinformation",
      ],
      required: true, 
    },
  },
  {
    timestamps: true, 
  }
);

// Middleware post-save pour logger la création d'un signalement
reportSchema.post("save", async function (req, res, next) {
  console.log("Report created successfully");
  next();
});

// Création du modèle Report
const Report = mongoose.model("Report", reportSchema);

module.exports = Report;