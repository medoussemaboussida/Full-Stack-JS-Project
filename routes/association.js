const express = require("express");
const router = express.Router();
const associationController = require("../controller/associationController");
const userController = require("../controller/userController");


// Créer une nouvelle association
router.post('/addAssociation',userController.verifyToken, associationController.addAssociation);

// Récupérer toutes les associations
router.get('/getAssociations', associationController.getAssociations);

// Récupérer une association par son ID
router.get('/getAssociationById/:id', associationController.getAssociationById);

// Mettre à jour une association par son ID
router.put('/updateAssociation/:id', associationController.updateAssociation);

// Supprimer une association par son ID
router.delete('/deleteAssociation/:id', associationController.deleteAssociation);

module.exports = router;
