const express = require('express');
const router = express.Router();
const mentalHealthController = require('../controller/mentalHealthController');
const userController = require('../controller/userController');

// Protect all routes
router.use(userController.verifyToken);

// Submit a mental health assessment
router.post('/assessment', mentalHealthController.submitAssessment);

// Get mental health assessment history
router.get('/assessment/history', mentalHealthController.getAssessmentHistory);

// Get a specific mental health assessment
router.get('/assessment/:id', mentalHealthController.getAssessment);






















































module.exports = router;
