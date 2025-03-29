const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true },
  publicKeys: { type: Map, of: String, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);