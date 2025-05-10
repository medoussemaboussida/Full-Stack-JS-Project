const MentalHealth = require('../model/mentalHealth');
const User = require('../model/user');
const path = require('path');
const fs = require('fs');

// Path to the Python script
const PYTHON_SCRIPT_PATH = path.join(__dirname, '..', 'Mental-Health-ML-Score', 'predict_mental_health.py');

// Load Python child process for model inference
const { spawn } = require('child_process');

/**
 * Submit a mental health assessment
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.submitAssessment = async (req, res) => {
  try {
    // Get user ID from the token verification middleware
    // The verifyToken middleware should set req.userId
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated or userId not available' });
    }

    console.log('User ID from token:', userId);

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Extract assessment data from request body
    const {
      counselingServiceUse,
      stressLevel,
      substanceUse,
      age,
      course,
      financialStress,
      physicalActivity,
      extracurricularInvolvement,
      semesterCreditLoad,
      familyHistory,
      chronicIllness,
      anxietyScore,
      depressionScore
    } = req.body;

    console.log('Request body:', req.body);

    // Validate required fields
    if (!counselingServiceUse || stressLevel === undefined || !substanceUse ||
        !age || !course || financialStress === undefined || !physicalActivity ||
        !extracurricularInvolvement || !semesterCreditLoad || !familyHistory ||
        !chronicIllness || anxietyScore === undefined || depressionScore === undefined) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Prepare data for model prediction
    const inputData = {
      'Counseling_Service_Use': counselingServiceUse,
      'Stress_Level': parseFloat(stressLevel),
      'Substance_Use': substanceUse,
      'Age': parseInt(age),
      'Course': course.toLowerCase(),
      'Financial_Stress': parseFloat(financialStress),
      'Physical_Activity': physicalActivity.toLowerCase(),
      'Extracurricular_Involvement': extracurricularInvolvement.toLowerCase(),
      'Semester_Credit_Load': parseInt(semesterCreditLoad),
      'Family_History': familyHistory.toLowerCase(),
      'Chronic_Illness': chronicIllness.toLowerCase(),
      'Anxiety_Score': parseFloat(anxietyScore),
      'Depression_Score': parseFloat(depressionScore)
    };

    // Get user's favorite activities if available
    const favoriteActivities = user.favoriteActivities || [];

    // Call the Python script for prediction
    const result = await predictMentalHealth(inputData, favoriteActivities);

    // Create a new mental health assessment record
    const mentalHealth = new MentalHealth({
      userId,
      counselingServiceUse,
      stressLevel: parseFloat(stressLevel),
      substanceUse,
      age: parseInt(age),
      course,
      financialStress: parseFloat(financialStress),
      physicalActivity,
      extracurricularInvolvement,
      semesterCreditLoad: parseInt(semesterCreditLoad),
      familyHistory,
      chronicIllness,
      anxietyScore: parseFloat(anxietyScore),
      depressionScore: parseFloat(depressionScore),
      riskLevel: result.risk_level,
      mentalHealthScore: result.mental_health_score,
      professionalHelp: result.professional_help,
      recommendedActivities: result.activities,
      dailyPractices: result.daily_practices
    });

    await mentalHealth.save();

    res.status(201).json({
      success: true,
      data: {
        id: mentalHealth._id,
        riskLevel: result.risk_level,
        mentalHealthScore: result.mental_health_score,
        professionalHelp: result.professional_help,
        recommendedActivities: result.activities,
        dailyPractices: result.daily_practices
      }
    });
  } catch (error) {
    console.error('Error submitting mental health assessment:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get mental health assessment history for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAssessmentHistory = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated or userId not available' });
    }

    console.log('Getting assessment history for user ID:', userId);

    const assessments = await MentalHealth.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    console.log(`Found ${assessments.length} assessments for user`);

    res.status(200).json({
      success: true,
      count: assessments.length,
      data: assessments
    });
  } catch (error) {
    console.error('Error getting mental health assessment history:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get a specific mental health assessment
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getAssessment = async (req, res) => {
  try {
    const userId = req.userId;
    const assessmentId = req.params.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated or userId not available' });
    }

    console.log(`Getting assessment ${assessmentId} for user ID: ${userId}`);

    const assessment = await MentalHealth.findOne({ _id: assessmentId, userId });

    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Error getting mental health assessment:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Helper function to predict mental health using Python script
 * @param {Object} inputData - Input data for prediction
 * @param {Array} favoriteActivities - User's favorite activities
 * @returns {Promise<Object>} - Prediction result
 */
function predictMentalHealth(inputData, favoriteActivities) {
  return new Promise((resolve, reject) => {
    // Create a Python process
    const python = spawn('python', [PYTHON_SCRIPT_PATH]);

    let dataString = '';

    // Send input data to the Python script
    python.stdin.write(JSON.stringify({
      input_data: inputData,
      favorite_activities: favoriteActivities
    }));
    python.stdin.end();

    // Collect data from script
    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    // Handle errors
    python.stderr.on('data', (data) => {
      console.error(`Python stderr: ${data}`);
      reject(new Error(`Python error: ${data}`));
    });

    // When the script is done
    python.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}`));
      }

      try {
        const result = JSON.parse(dataString);
        resolve(result);
      } catch (error) {
        reject(new Error(`Error parsing Python output: ${error.message}`));
      }
    });
  });
}
