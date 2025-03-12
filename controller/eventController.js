const mongoose = require('mongoose');
const Event = require('../model/event');
const User = require('../model/user');
const multer = require('multer');
const path = require('path');
const PDFDocument = require("pdfkit");
const axios = require("axios"); // Pour télécharger l'image depuis une URL


exports.generateEventPDF = async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Récupération de l'événement avec ID: ${id}`);
  
      // Récupérer l'événement depuis la base de données
      const event = await Event.findById(id).populate("created_by", "username email");
      if (!event) {
        console.log("Événement non trouvé pour ID:", id);
        return res.status(404).json({ message: "Événement non trouvé" });
      }
  
      // Créer un nouveau document PDF
      const doc = new PDFDocument({ margin: 50 });
  
      // Définir les en-têtes HTTP pour indiquer un téléchargement de PDF
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${event.title}_Details.pdf"`);
  
      // Pipe le document PDF directement dans la réponse HTTP
      doc.pipe(res);
  
      // Ajouter un en-tête au PDF
      doc.fontSize(20).text("Event Details", { align: "center" });
      doc.moveDown(1);
  
      // Ajouter les détails de l'événement
      doc.fontSize(14).text(`Title: ${event.title || "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
  
      doc.fontSize(12).text(`Description: ${event.description || "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
  
      // Formatter la date
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });
      };
      doc.fontSize(12).text(`Date: ${event.date ? formatDate(event.date) : "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
  
      // Formatter l'heure
      const formatTime = (timeString) => {
        if (!timeString) return "N/A";
        const [hours, minutes] = timeString.split(":");
        const period = hours >= 12 ? "PM" : "AM";
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${minutes} ${period}`;
      };
      doc.fontSize(12).text(`Time: ${formatTime(event.heure)}`, { align: "left" });
      doc.moveDown(0.5);
  
      doc.fontSize(12).text(`Location: ${event.localisation || "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
  
      doc.fontSize(12).text(`Venue: ${event.lieu || "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
  
      doc.fontSize(12).text(`Organizer: ${event.created_by?.username || "Unknown"}`, { align: "left" });
      doc.moveDown(0.5);
  
      doc.fontSize(12).text(`Contact: ${event.created_by?.email || event.contact_email || "N/A"}`, { align: "left" });
      doc.moveDown(0.5);
  
      // Finaliser le document
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
  // Configuration de Multer pour stocker les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Dossier où les fichiers seront stockés
  },
  filename: (req, file, cb) => {
    cb(null, `event-${Date.now()}-${file.originalname}`); // Nom unique avec préfixe "event"
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
}).single('image'); // Champ attendu : "image"

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

      const { title, description, date, localisation, lieu, heure, contact_email } = req.body;

      // Validation des champs obligatoires
      if (!title || !description || !date || !localisation || !lieu || !heure || !contact_email) {
        console.log('Champs manquants:', { title, description, date, localisation, lieu, heure, contact_email });
        return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
      }

      // Validation du format de date et heure
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'La date doit être au format YYYY-MM-DD' });
      }
      if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(heure)) {
        return res.status(400).json({ message: 'L’heure doit être au format HH:MM' });
      }

      // Combinaison de date et heure
      const combinedDateTime = `${date}T${heure}:00Z`;
      console.log('combinedDateTime:', combinedDateTime);
      const eventDate = new Date(combinedDateTime);
      if (isNaN(eventDate.getTime())) {
        console.log('Date invalide:', combinedDateTime);
        return res.status(400).json({ message: 'Format de date ou d’heure invalide' });
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
        date: eventDate,
        localisation,
        lieu,
        heure,
        contact_email,
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
    const events = await Event.find({ date: { $gte: new Date() } })
      .sort({ date: 1 })
      .populate('created_by', 'username') // Inclut le nom de l'utilisateur
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
        .populate('created_by', 'username email imageUrl') // Inclut username, email et imageUrl
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
      const { title, description, date, localisation, lieu, heure, contact_email } = req.body;
  
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
      if (date) {
        const eventDate = new Date(date);
        if (isNaN(eventDate.getTime())) {
          return res.status(400).json({ message: 'Format de date invalide' });
        }
        event.date = eventDate;
      }
      if (heure) {
        if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(heure)) {
          return res.status(400).json({ message: 'Format d’heure invalide (HH:MM)' });
        }
        event.heure = heure;
      }
      if (localisation) event.localisation = localisation;
      if (lieu) event.lieu = lieu;
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

    // Vérifier si l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }

    // Vérification des permissions
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