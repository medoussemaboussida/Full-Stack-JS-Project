const mongoose = require('mongoose');

const solutionSchema = new mongoose.Schema({
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  proposedSolution: { type: String, required: true },
  generatedDate: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  confidenceLevel: { type: Number, min: 0, max: 1 },
  estimatedResolutionTime: { type: Number } // In days
});

module.exports = mongoose.model('Solution', solutionSchema);