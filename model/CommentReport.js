const mongoose = require('mongoose');

const commentReportSchema = new mongoose.Schema({
  commentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Commentaire',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'inappropriate_content',
      'spam',
      'harassment',
      'offensive_language',
      'misinformation',
      'other',
    ],
  },
  customReason: {
    type: String,
    required: function () {
      return this.reason === 'other';
    },
  },
  dateReported: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CommentReport', commentReportSchema);