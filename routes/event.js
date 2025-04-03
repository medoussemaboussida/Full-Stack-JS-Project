const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController'); // Chemin correct supposé
const userController = require('../controller/userController'); // Middleware pour JWT

console.log('Event controller loaded:', eventController.getEvents); // Vérifiez ceci
// Ajouter un événement (authentification requise)
router.post('/addEvent', userController.verifyToken, eventController.addEvent);
// Récupérer tous les événements (accessible publiquement)
router.get("/getEvents", eventController.getEvents); // Frontend (événements approuvés)


router.get("/getAllEvents", userController.verifyToken, eventController.getAllEventsForAdmin); // Backoffice
router.put("/toggleApproval/:id", userController.verifyToken, eventController.toggleEventApproval); // Nouvelle route
// Récupérer un événement par ID (accessible publiquement)
router.get('/getEvent/:id', eventController.getEventById);

// Mettre à jour un événement (authentification requise)
router.put('/:id', userController.verifyToken, eventController.updateEvent);

// Supprimer un événement (authentification requise)
router.delete('/:id', userController.verifyToken, eventController.deleteEvent);

// Générer un PDF pour un événement (accessible publiquement)
router.get('/generatePDF/:id', eventController.generateEventPDF);


router.get("/checkParticipation/:eventId", userController.verifyToken, eventController.checkParticipation);
router.post("/participate/:id", userController.verifyToken, eventController.participate);
router.post("/cancelParticipation/:id", userController.verifyToken, eventController.cancelParticipation);
module.exports = router;