const express = require("express");
const router = express.Router();
const associationController = require("../controller/associationController");
const userController = require("../controller/userController");

// Middleware to restrict access to admin users
const restrictToAdmin = async (req, res, next) => {
  try {
    const user = await require("../model/user").findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access restricted to admin users" });
    }
    next();
  } catch (error) {
    console.error("Error in restrictToAdmin:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// Create a new association (protected, association_member only)
router.post("/addAssociation", userController.verifyToken, associationController.addAssociation);

// Get all associations (back-office, admin only)
router.get("/getAssociations",userController.verifyToken, associationController.getAssociations);

// Get approved associations (public or protected, accessible to all authenticated users)
router.get("/getApprovedAssociations", userController.verifyToken, associationController.getApprovedAssociations);

// Get association by ID (protected, accessible to creator or admin)
router.get("/getAssociationById/:id", userController.verifyToken, associationController.getAssociationById);

// Update association by ID (protected, creator only)
router.put("/:id", userController.verifyToken, associationController.updateAssociation);

// Delete association by ID (protected, creator or admin only)
router.delete("/:id", userController.verifyToken, associationController.deleteAssociation);

// Toggle association approval (back-office, admin only)
router.put("/toggleApproval/:id", userController.verifyToken, associationController.toggleApproval);

// Check if user has an association (protected, association_member only)
router.get("/check", userController.verifyToken, associationController.checkAssociation);

// Get support type statistics (protected, admin only)
router.get("/support-type-stats", userController.verifyToken, restrictToAdmin, associationController.getSupportTypeStats);

module.exports = router;