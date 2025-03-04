const express = require('express');
const router = express.Router();
const complaintResponseController = require('../controller/complaintResponseController');

// Route pour ajouter une réponse à une réclamation
router.post('/addResponse/:complaint_id/:user_id', complaintResponseController.addComplaintResponse);
router.get('/getResponse/:complaint_id/:user_id', complaintResponseController.getComplaintResponses);
router.get('/getAllResponse/:complaint_id', complaintResponseController.getAllResponsesForComplaint);

module.exports = router;
