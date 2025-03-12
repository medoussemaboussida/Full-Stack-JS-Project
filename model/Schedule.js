const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // e.g., "2025-03-11"
  activities: [
    {
      activityId: { type: mongoose.Schema.Types.ObjectId, ref: "Activity", required: true },
      completed: { type: Boolean, default: false },
    },
  ],
});

module.exports = mongoose.model("Schedule", ScheduleSchema);