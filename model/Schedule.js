const mongoose = require('mongoose');
const scheduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  activities: [{
    activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' },
    completed: { type: Boolean, default: false },
  }],
});
module.exports = mongoose.model('Schedule', scheduleSchema);