// models/Schedule.js
const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  activities: [{
    activityId: { type: String, required: true }, // Ou ObjectId si vous référencez Activity
    completed: { type: Boolean, default: false },
  }],
});

module.exports = mongoose.model("Schedule", scheduleSchema);