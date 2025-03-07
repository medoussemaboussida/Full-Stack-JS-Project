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
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Start time must be in HH:MM format"],
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "End time must be in HH:MM format"],
  },
  status: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending",
  },
}, { timestamps: true });

// Middleware pour valider que l'heure de fin est après l'heure de début
appointmentSchema.pre("save", function (next) {
  const start = parseInt(this.startTime.replace(":", ""));
  const end = parseInt(this.endTime.replace(":", ""));
  if (start >= end) {
    return next(new Error("End time must be after start time"));
  }
  next();
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = Appointment;