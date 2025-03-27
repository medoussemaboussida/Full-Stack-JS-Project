const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  what: { type: String, required: true },           // Quel est le problème ?
  source: { type: String, required: true },         // D'où vient le problème ?
  reaction: { type: String, required: true },       // Comment avez-vous réagi au problème ?
  resolved: { type: Boolean, default: false },      // Le problème est-il résolu ?
  satisfaction: {
    type: String,
    enum: ['100%', '75%', '50%', '25%', '0%'],       // Satisfaction en pourcentage
    required: true
  },
  startDate: { type: Date },                        // Date de début du problème
  endDate: { type: Date },                          // Date de fin du problème
  createdAt: { type: Date, default: Date.now },     // Date de création
});

module.exports = mongoose.model('Problem', problemSchema);
