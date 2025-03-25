const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true }, // e.g., "2025-03-25"
  note: { type: String, required: true },
});

module.exports = mongoose.model("Note", noteSchema);