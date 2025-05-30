const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController'); // Chemin correct supposé
const userController = require('../controller/userController'); // Middleware pour JWT
const Event = require('../model/event'); // Assurez-vous que ce chemin est correct
//const Story = require('../model/story');



console.log('Event controller loaded:', eventController.getEvents);
console.log('Upload middleware loaded:', eventController.upload);
console.log('Create story handler loaded:', eventController.createStory);
console.log('Cancel partner participation loaded:', eventController.cancelPartnerParticipation);



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
router.post('/participateAsPartner/:eventId', userController.verifyToken, eventController.participateAsPartner);

// Route pour récupérer les événements liés
// Route pour récupérer les événements liés
router.post('/related', async (req, res) => {
    console.log('Received request body:', req.body); // Débogage
    const { event_type, status } = req.body;
  
    try {
      if (!event_type) {
        return res.status(400).json({ message: 'Event type is required' });
      }
  
      const relatedEvents = await Event.find({
        event_type: event_type,
        status: { $in: status || ['upcoming', 'ongoing'] }, // Filtrer par statut
      })
        .sort({ start_date: 1 }) // Trier par date de début
        .limit(10); // Limite initiale côté backend
  
      console.log('Related events found:', relatedEvents); // Débogage
      res.json(relatedEvents);
    } catch (error) {
      console.error('Error in /events/related:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  router.put('/updateEvent/:id',  userController.verifyToken, eventController.updateEvent);
router.post("/like/:id", userController.verifyToken, eventController.likeEvent);
router.post("/dislike/:id", userController.verifyToken, eventController.dislikeEvent);
router.post("/favorite/:id", userController.verifyToken, eventController.favoriteEvent);
router.get("/checkLike/:id", userController.verifyToken, eventController.checkLike);
router.get("/checkDislike/:id",userController.verifyToken, eventController.checkDislike);
router.get("/checkFavorite/:id", userController.verifyToken, eventController.checkFavorite);
router.post("/events/cancelPartnerParticipation/:eventId", userController.verifyToken, eventController.cancelPartnerParticipation);
router.get("/checkPartnerParticipation/:eventId",  userController.verifyToken, eventController.checkPartnerParticipation);
//router.post("/cancelPartnerParticipation/:id", userController.verifyToken, eventController.cancelPartnerParticipation);
router.get("/verifyParticipation/:eventId/:userId", eventController.verifyParticipation);
router.get("/verifyPartner/:eventId/:userId", eventController.verifyPartner);

//router.get('/getEventsByCreator/:creatorId', eventController.getEventsByCreator);
// New story routes
router.post("/stories/upload", userController.verifyToken, eventController.uploadStory);
router.get("/stories", eventController.getStories);
router.get("/stories/replies/:storyId", eventController.getStoryReplies);
router.post("/stories/like/:storyId",userController.verifyToken,  eventController.likeStory);
router.post("/stories/replies/:storyId",userController.verifyToken ,eventController.replyToStory);
//router.get("/checkPartnerParticipation/:eventId", userController.verifyToken, eventController.checkPartnerParticipation); // Ajouté

router.get('/getEventsByUser/:userId', userController.verifyToken , eventController.getEventsByUser);
router.post('/xai-location', userController.verifyToken, eventController.getLocationDetails);
module.exports = router;