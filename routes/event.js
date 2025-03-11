const express = require('express');
const router = express.Router();
const eventController = require('../controller/eventController');

router.post('/addEvent', eventController.addEvent);
router.get('/getEvents', eventController.getEvents);
router.get('/getEventById/:id', eventController.getEventById);
router.put('/updateEvent/:id', eventController.updateEvent);
router.delete('/deleteEvent/:id', eventController.deleteEvent);

module.exports = router;