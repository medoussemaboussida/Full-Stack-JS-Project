const express = require("express");
const router = express.Router();
const complaintController = require("../controller/complaintController");

// Route pour ajouter une réclamation avec user_id passé en paramètre
router.post("/addComplaint/:user_id", complaintController.addComplaint);
router.get("/getComplaint", complaintController.getComplaints);
router.get('/getComplaint/:user_id', complaintController.getUserComplaints);
router.put('/updateComplaint/:complaint_id', complaintController.updateComplaint);
router.delete('/deleteComplaint/:complaint_id', complaintController.deleteComplaint);
router.put("/updateComplaintStatus/:complaint_id", complaintController.updateComplaintStatus);
router.post("/addResponse/:complaint_id", complaintController.addResponse);
router.get("/getComplaint/:complaintId", complaintController.getComplaintById);
module.exports = router;
