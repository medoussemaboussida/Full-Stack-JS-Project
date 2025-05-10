const mongoose = require('mongoose');

const mentalHealthSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Assessment inputs
  counselingServiceUse: {
    type: String,
    enum: ['never', 'occasionally', 'regularly'],
    required: true
  },
  stressLevel: {
    type: Number,
    min: 0,
    max: 5,
    required: true
  },
  substanceUse: {
    type: String,
    enum: ['never', 'occasionally', 'regularly'],
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  financialStress: {
    type: Number,
    min: 0,
    max: 5,
    required: true
  },
  physicalActivity: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    required: true
  },
  extracurricularInvolvement: {
    type: String,
    enum: ['low', 'moderate', 'high'],
    required: true
  },
  semesterCreditLoad: {
    type: Number,
    required: true
  },
  familyHistory: {
    type: String,
    enum: ['yes', 'no'],
    required: true
  },
  chronicIllness: {
    type: String,
    enum: ['yes', 'no'],
    required: true
  },
  anxietyScore: {
    type: Number,
    min: 0,
    max: 5,
    required: true
  },
  depressionScore: {
    type: Number,
    min: 0,
    max: 5,
    required: true
  },
  
  // Assessment results
  riskLevel: {
    type: String,
    enum: ['High', 'Low'],
    required: true
  },
  mentalHealthScore: {
    type: Number,
    required: true
  },
  professionalHelp: {
    type: String,
    default: null
  },
  
  // Recommendations
  recommendedActivities: [{
    type: String
  }],
  dailyPractices: [{
    type: String
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
mentalHealthSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MentalHealth', mentalHealthSchema);
