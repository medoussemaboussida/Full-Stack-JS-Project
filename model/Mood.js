const mongoose = require("mongoose");

const moodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Activity",
    required: true,
  },
  mood: {
    type: String,
    enum: ["Very Sad", "Sad", "Neutral", "Happy", "Very Happy"],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Mood", moodSchema);