const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const chatSchema = new mongoose.Schema({
  chatId: { type: String, unique: true, required: true, default: uuidv4 },
  roomCode: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedMessage: { type: String, required: true },
  iv: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);