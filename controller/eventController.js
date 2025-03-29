const mongoose = require('mongoose');
const Event = require('../model/event');
const User = require('../model/user');
const multer = require('multer');
const path = require('path');
const PDFDocument = require("pdfkit");

// Configuration de Multer pour stocker les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `event-${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images JPEG, JPG, PNG et GIF sont autorisées !'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
}).single('image');

// Ajouter un événement
exports.addEvent = (req, res) => {
  console.time('addEvent');
  
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      console.log('Requête reçue:', req.body);
      console.log('Fichier reçu:', req.file);

      const { title, description, start_date, end_date, localisation, lieu, heure, contact_email, event_type, online_link } = req.body;

      // Validation des champs obligatoires
      if (!title || !description || !start_date || !end_date || !heure || !contact_email || !event_type) {
        console.log('Champs manquants:', { title, description, start_date, end_date, heure, contact_email, event_type });
        return res.status(400).json({ message: 'Les champs titre, description, dates, heure, email et type d’événement sont obligatoires' });
      }

      // Validation spécifique selon le type d'événement
      if (event_type === 'in-person' && (!localisation || !lieu)) {
        return res.status(400).json({ message: 'Localisation et lieu sont requis pour un événement en présentiel' });
      }
      if (event_type === 'online' && !online_link) {
        return res.status(400).json({ message: 'Le lien en ligne est requis pour un événement en ligne' });
      }

      // Validation du format de start_date et end_date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return res.status(400).json({ message: 'Les dates doivent être au format YYYY-MM-DD' });
      }
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(heure)) {
        return res.status(400).json({ message: 'L’heure doit être au format HH:MM' });
      }

      // Combinaison de date et heure pour start_date et end_date
      const startDateTime = `${start_date}T${heure}:00Z`;
      const endDateTime = `${end_date}T${heure}:00Z`; // Assuming same time for simplicity
      const eventStartDate = new Date(startDateTime);
      const eventEndDate = new Date(endDateTime);

      if (isNaN(eventStartDate.getTime()) || isNaN(eventEndDate.getTime())) {
        console.log('Dates invalides:', { startDateTime, endDateTime });
        return res.status(400).json({ message: 'Format de date ou d’heure invalide' });
      }
      if (eventEndDate < eventStartDate) {
        return res.status(400).json({ message: 'La date de fin doit être postérieure à la date de début' });
      }

      // Validation du lien en ligne si fourni
      if (online_link && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(online_link)) {
        return res.status(400).json({ message: 'Le lien en ligne doit être une URL valide' });
      }

      // Vérification de l'utilisateur
      console.log('Vérification utilisateur avec ID:', req.userId);
      if (!mongoose.Types.ObjectId.isValid(req.userId)) {
        return res.status(400).json({ message: 'ID utilisateur invalide' });
      }
      const user = await User.findById(req.userId, 'role').lean();
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
      if (user.role !== 'association_member') {
        return res.status(403).json({ message: 'Seuls les membres associatifs peuvent créer un événement' });
      }

      // Gestion de l'image (optionnelle)
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      // Création de l'événement
      const newEvent = new Event({
        title,
        description,
        start_date: eventStartDate,
        end_date: eventEndDate,
        localisation: event_type === 'in-person' ? localisation : null,
        lieu: event_type === 'in-person' ? lieu : null,
        heure,
        contact_email,
        event_type,
        online_link: event_type === 'online' ? online_link : null,
        imageUrl,
        created_by: req.userId
      });

      const savedEvent = await newEvent.save();
      console.log(`✅ Événement "${title}" créé avec succès.`);
      console.timeEnd('addEvent');
      res.status(201).json({ message: 'Événement ajouté avec succès', data: savedEvent });
    } catch (error) {
      console.error('Erreur lors de l’ajout de l’événement :', error.stack);
      res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
    }
  });
};

// Récupérer tous les événements
exports.getEvents = async (req, res) => {
  console.time('getEvents');
  try {
    console.log('Récupération des événements en cours...');
    const events = await Event.find({ start_date: { $gte: new Date() } })
      .sort({ start_date: 1 })
      .populate('created_by', 'username')
      .lean();
    console.log('Événements récupérés:', events.length);
    res.status(200).json(events);
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error.stack);
    res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
  } finally {
    console.timeEnd('getEvents');
  }
};

// Récupérer un événement par ID
exports.getEventById = async (req, res) => {
  console.time('getEventById');
  try {
    const { id } = req.params;
    console.log('Récupération de l’événement avec ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const event = await Event.findById(id)
      .populate('created_by', 'username email imageUrl')
      .lean();

    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    console.timeEnd('getEventById');
    res.status(200).json(event);
  } catch (error) {
    console.error('Erreur lors de la récupération de l’événement :', error.stack);
    res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
  }
};

// Mettre à jour un événement
exports.updateEvent = async (req, res) => {
  console.time('updateEvent');
  try {
    console.log('Requête reçue pour mise à jour:', req.body);

    const { id } = req.params;
    const { title, description, start_date, end_date, localisation, lieu, heure, contact_email, event_type, online_link } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.created_by.toString() !== req.userId) {
      return res.status(403).json({ message: 'Vous n’êtes pas autorisé à modifier cet événement' });
    }

    // Mise à jour des champs si fournis
    if (title) event.title = title;
    if (description) event.description = description;
    if (start_date) {
      const eventStartDate = new Date(start_date);
      if (isNaN(eventStartDate.getTime())) {
        return res.status(400).json({ message: 'Format de date de début invalide' });
      }
      event.start_date = eventStartDate;
    }
    if (end_date) {
      const eventEndDate = new Date(end_date);
      if (isNaN(eventEndDate.getTime())) {
        return res.status(400).json({ message: 'Format de date de fin invalide' });
      }
      event.end_date = eventEndDate;
    }
    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ message: 'La date de fin doit être postérieure à la date de début' });
    }
    if (heure) {
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(heure)) {
        return res.status(400).json({ message: 'Format d’heure invalide (HH:MM)' });
      }
      event.heure = heure;
    }
    if (event_type) {
      if (!['in-person', 'online'].includes(event_type)) {
        return res.status(400).json({ message: 'Type d’événement invalide (doit être "in-person" ou "online")' });
      }
      event.event_type = event_type;
      if (event_type === 'in-person') {
        if (localisation) event.localisation = localisation;
        if (lieu) event.lieu = lieu;
        event.online_link = null; // Clear online link for in-person events
      } else if (event_type === 'online') {
        if (online_link) {
          if (!/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(online_link)) {
            return res.status(400).json({ message: 'Le lien en ligne doit être une URL valide' });
          }
          event.online_link = online_link;
        }
        event.localisation = null; // Clear location fields for online events
        event.lieu = null;
      }
    }
    if (contact_email) event.contact_email = contact_email;

    const updatedEvent = await event.save();
    console.log(`✅ Événement "${title || event.title}" mis à jour avec succès.`);
    console.timeEnd('updateEvent');
    res.status(200).json({ message: 'Événement mis à jour avec succès', data: updatedEvent });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l’événement :', error.stack);
    res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
  }
};

// Supprimer un événement
exports.deleteEvent = async (req, res) => {
  console.time('deleteEvent');
  try {
    const { id } = req.params;
    console.log('Suppression de l’événement avec ID:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    if (event.created_by.toString() !== req.userId) {
      return res.status(403).json({ message: 'Vous n’êtes pas autorisé à supprimer cet événement' });
    }

    await Event.findByIdAndDelete(id);
    console.log(`✅ Événement avec ID "${id}" supprimé avec succès.`);
    console.timeEnd('deleteEvent');
    res.status(200).json({ message: 'Événement supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l’événement :', error.stack);
    res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
  }
};

// Générer un PDF pour un événement
exports.generateEventPDF = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Récupération de l'événement avec ID: ${id}`);

    const event = await Event.findById(id).populate("created_by", "username email");
    if (!event) {
      console.log("Événement non trouvé pour ID:", id);
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${event.title}_Details.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text("Event Details", { align: "center" });
    doc.moveDown(1);

    doc.fontSize(14).text(`Title: ${event.title || "N/A"}`, { align: "left" });
    doc.moveDown(0.5);

    doc.fontSize(12).text(`Description: ${event.description || "N/A"}`, { align: "left" });
    doc.moveDown(0.5);

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });
    };
    doc.fontSize(12).text(`Start Date: ${event.start_date ? formatDate(event.start_date) : "N/A"}`, { align: "left" });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`End Date: ${event.end_date ? formatDate(event.end_date) : "N/A"}`, { align: "left" });
    doc.moveDown(0.5);

    const formatTime = (timeString) => {
      if (!timeString) return "N/A";
      const [hours, minutes] = timeString.split(":");
      const period = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      return `${formattedHours}:${minutes} ${period}`;
    };
    doc.fontSize(12).text(`Time: ${formatTime(event.heure)}`, { align: "left" });
    doc.moveDown(0.5);

    doc.fontSize(12).text(`Event Type: ${event.event_type === 'in-person' ? 'In-Person' : 'Online'}`, { align: "left" });
    doc.moveDown(0.5);

    if (event.event_type === 'in-person') {
      doc.fontSize(12).text(`Location: ${event.localisation || "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Venue: ${event.lieu || "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
    } else {
      doc.fontSize(12).text(`Online Link: ${event.online_link || "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
    }

    doc.fontSize(12).text(`Organizer: ${event.created_by?.username || "Unknown"}`, { align: "left" });
    doc.moveDown(0.5);

    doc.fontSize(12).text(`Contact: ${event.created_by?.email || event.contact_email || "N/A"}`, { align: "left" });
    doc.moveDown(0.5);

    doc.end();
    console.log("PDF généré avec succès pour l'événement:", event.title);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error.message, error.stack);
    res.status(500).json({
      message: "Erreur lors de la génération du PDF",
      error: error.message,
      stack: error.stack,
    });
  }
};

module.exports = exports;