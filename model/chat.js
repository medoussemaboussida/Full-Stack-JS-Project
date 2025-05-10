const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const chatSchema = new mongoose.Schema({
  chatId: { type: String, unique: true, required: true, default: uuidv4 },
  roomCode: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedMessage: { type: String },
  iv: { type: String },
  voiceMessage: { type: String },
  isQuestionnaireLink: { type: Boolean, default: false }, // New field for questionnaire links

  isVoice: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);