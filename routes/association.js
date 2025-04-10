const express = require("express");
const router = express.Router();
const associationController = require("../controller/associationController");
const userController = require("../controller/userController");

// Créer une nouvelle association (protégée par token)
router.post('/addAssociation', userController.verifyToken, associationController.addAssociation);

// Récupérer toutes les associations (pour le back-office, protégée par token)
router.get('/getAssociations', userController.verifyToken, associationController.getAssociations);

// Récupérer uniquement les associations approuvées (pour le front-end, protégée par token)
router.get('/getApprovedAssociations', userController.verifyToken, associationController.getApprovedAssociations);

// Récupérer une association par son ID (protégée par token)
router.get('/getAssociationById/:id', userController.verifyToken, associationController.getAssociationById);

// Mettre à jour une association par son ID (protégée par token)
router.put('/updateAssociation/:id', userController.verifyToken, associationController.updateAssociation);

// Supprimer une association par son ID (protégée par token)
router.delete('/deleteAssociation/:id', userController.verifyToken, associationController.deleteAssociation);

// Basculer l'approbation d'une association par son ID (pour le back-office, protégée par token)
router.put('/toggleApproval/:id', userController.verifyToken, associationController.toggleApproval);
router.get('/check', userController.verifyToken, associationController.checkAssociation);
//router.get('/support-type-stats',  associationController.getSupportTypeStats);
module.exports = router;