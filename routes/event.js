const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController'); // Chemin correct supposé
const userController = require('../controller/userController'); // Middleware pour JWT

// Ajouter un événement (authentification requise)
router.post('/addEvent', userController.verifyToken, eventController.addEvent);
// Récupérer tous les événements (accessible publiquement)
router.get('/getEvents', eventController.getEvents);

// Récupérer un événement par ID (accessible publiquement)
router.get('/getEvent/:id', eventController.getEventById);

// Mettre à jour un événement (authentification requise)
router.put('/:id', userController.verifyToken, eventController.updateEvent);

// Supprimer un événement (authentification requise)
router.delete('/:id', userController.verifyToken, eventController.deleteEvent);

// Générer un PDF pour un événement (accessible publiquement)
router.get('/generatePDF/:id', eventController.generateEventPDF);

module.exports = router;