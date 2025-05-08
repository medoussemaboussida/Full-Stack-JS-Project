const mongoose = require('mongoose');

const questionnaireResponseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  roomCode: {
    type: String,
    required: true,
  },
  responses: [
    {
      question: {
        type: String,
        required: true,
      },
      answer: {
        type: Number,
        required: true,
        min: 0,
        max: 3,
      },
    },
  ],
  totalScore: {
    type: Number,
    min: 0,
    required: false, // Not required since score calculation is not needed
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('QuestionnaireResponse', questionnaireResponseSchema);