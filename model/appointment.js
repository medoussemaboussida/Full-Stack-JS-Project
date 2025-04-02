const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  psychiatrist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  date: {
    type: Date, // Stores the date (e.g., "2025-04-04")
    required: true,
  },
  startTime: {
    type: String, // Stores the start time (e.g., "10:00")
    required: true,
  },
  endTime: {
    type: String, // Stores the end time (e.g., "10:30")
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "canceled", "completed"],
    default: "pending",
  },
}, { timestamps: true });

// Validate that endTime is after startTime on the same date
appointmentSchema.pre("save", function (next) {
  const [startHour, startMinute] = this.startTime.split(":").map(Number);
  const [endHour, endMinute] = this.endTime.split(":").map(Number);

  const startDateTime = new Date(this.date);
  startDateTime.setHours(startHour, startMinute, 0, 0);

  const endDateTime = new Date(this.date);
  endDateTime.setHours(endHour, endMinute, 0, 0);

  if (endDateTime <= startDateTime) {
    return next(new Error("End time must be after start time on the same date"));
  }
  next();
});

// Compound index to prevent overlapping appointments for the same psychiatrist
appointmentSchema.index(
  { psychiatrist: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = Appointment;