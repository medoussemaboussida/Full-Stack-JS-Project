const mongoose = require("mongoose");
const Event = require("../model/event");
const User = require("../model/user");
const multer = require("multer");
const path = require("path");
const PDFDocument = require("pdfkit");

// Configuration de Multer pour stocker les images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `event-${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error("Seules les images JPEG, JPG, PNG et GIF sont autorisées !"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single("image");

// Ajouter un événement
exports.addEvent = async (req, res) => {
  console.time("addEvent");
  upload(req, res, async (err) => {
    if (err) {
      console.error("Erreur Multer:", err.message);
      return res.status(400).json({ message: err.message });
    }

    try {
      const {
        title, description, start_date, end_date, localisation, lieu, heure,
        contact_email, event_type, online_link, max_participants
      } = req.body;

      // Validation des champs obligatoires
      const requiredFields = { title, description, start_date, end_date, heure, contact_email, event_type };
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);
      if (missingFields.length) {
        return res.status(400).json({ message: `Champs obligatoires manquants: ${missingFields.join(", ")}` });
      }

      // Validation selon le type d'événement
      if (event_type === "in-person" && (!localisation || !lieu)) {
        return res.status(400).json({ message: "Localisation et lieu sont requis pour un événement en présentiel" });
      }
      if (event_type === "online" && !online_link) {
        return res.status(400).json({ message: "Le lien en ligne est requis pour un événement en ligne" });
      }

      // Validation des dates et heures
      const eventStartDate = new Date(`${start_date}T${heure}:00Z`);
      const eventEndDate = new Date(`${end_date}T${heure}:00Z`);
      if (isNaN(eventStartDate.getTime()) || isNaN(eventEndDate.getTime())) {
        return res.status(400).json({ message: "Format de date ou d’heure invalide (attendu : YYYY-MM-DD et HH:MM)" });
      }
      if (eventEndDate <= eventStartDate) {
        return res.status(400).json({ message: "La date de fin doit être postérieure à la date de début" });
      }

      // Validation de max_participants
      const maxParticipants = max_participants ? parseInt(max_participants, 10) : null;
      if (max_participants && (isNaN(maxParticipants) || maxParticipants <= 0)) {
        return res.status(400).json({ message: "Le nombre maximum de participants doit être un entier positif" });
      }

      // Vérification de l'utilisateur
      if (!mongoose.Types.ObjectId.isValid(req.userId)) {
        return res.status(400).json({ message: "ID utilisateur invalide" });
      }
      const user = await User.findById(req.userId, "role").lean();
      if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
      if (user.role !== "association_member") {
        return res.status(403).json({ message: "Seuls les membres associatifs peuvent créer un événement" });
      }

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const newEvent = new Event({
        title, description, start_date: eventStartDate, end_date: eventEndDate,
        localisation: event_type === "in-person" ? localisation : null,
        lieu: event_type === "in-person" ? lieu : null,
        heure, contact_email, event_type,
        online_link: event_type === "online" ? online_link : null,
        imageUrl, created_by: req.userId, max_participants: maxParticipants,
        participants: [], // Toujours vide au départ
        status: "upcoming", // Défaut explicite
      });

      const savedEvent = await newEvent.save();
      console.log(`✅ Événement "${title}" créé avec succès. ID: ${savedEvent._id}`);
      res.status(201).json({ message: "Événement ajouté avec succès", data: savedEvent });
    } catch (error) {
      console.error("Erreur lors de l’ajout de l’événement:", error.stack);
      res.status(500).json({ message: "Erreur serveur interne", error: error.message });
    } finally {
      console.timeEnd("addEvent");
    }
  });
};

// Récupérer tous les événements
exports.getEvents = async (req, res) => {
  console.time("getEvents");
  try {
    console.log("Entering getEvents...");
    console.log("Starting Event.find query...");
    const currentDate = new Date();
    const events = await Event.find({
      $or: [
        { status: { $in: ["upcoming", "ongoing"] } },
        { end_date: { $gte: currentDate } }, // Inclut les événements non terminés
      ],
    })
      .sort({ start_date: 1 })
      .populate("created_by", "username")
      .populate("participants", "username")
      .lean();

    console.log("Events retrieved:", events.length);
    res.status(200).json(events);
  } catch (error) {
    console.error("Erreur lors de la récupération des événements:", error.stack);
    res.status(500).json({ message: "Erreur serveur interne", error: error.message });
  } finally {
    console.timeEnd("getEvents");
  }
};

// Récupérer un événement par ID
exports.getEventById = async (req, res) => {
  console.time("getEventById");
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const event = await Event.findById(id)
      .populate("created_by", "username email imageUrl")
      .populate("participants", "username")
      .lean();

    if (!event) return res.status(404).json({ message: "Événement non trouvé" });

    console.log(`Événement récupéré: ${event.title}`);
    res.status(200).json(event);
  } catch (error) {
    console.error("Erreur lors de la récupération de l’événement:", error.stack);
    res.status(500).json({ message: "Erreur serveur interne", error: error.message });
  } finally {
    console.timeEnd("getEventById");
  }
};

// Mettre à jour un événement
exports.updateEvent = async (req, res) => {
  console.time("updateEvent");
  try {
    const { id } = req.params;
    const { title, description, start_date, end_date, localisation, lieu, heure, contact_email, event_type, online_link, max_participants } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });
    if (event.created_by.toString() !== req.userId) {
      return res.status(403).json({ message: "Vous n’êtes pas autorisé à modifier cet événement" });
    }

    // Mise à jour des champs
    if (title) event.title = title;
    if (description) event.description = description;
    if (start_date && heure) {
      const eventStartDate = new Date(`${start_date}T${heure}:00Z`);
      if (isNaN(eventStartDate.getTime())) {
        return res.status(400).json({ message: "Format de date de début ou heure invalide" });
      }
      event.start_date = eventStartDate;
    }
    if (end_date && heure) {
      const eventEndDate = new Date(`${end_date}T${heure}:00Z`);
      if (isNaN(eventEndDate.getTime())) {
        return res.status(400).json({ message: "Format de date de fin ou heure invalide" });
      }
      event.end_date = eventEndDate;
    }
    if (event.end_date <= event.start_date) {
      return res.status(400).json({ message: "La date de fin doit être postérieure à la date de début" });
    }
    if (heure) event.heure = heure;
    if (event_type) {
      event.event_type = event_type;
      if (event_type === "in-person") {
        event.localisation = localisation || event.localisation;
        event.lieu = lieu || event.lieu;
        event.online_link = null;
      } else if (event_type === "online") {
        event.online_link = online_link || event.online_link;
        event.localisation = null;
        event.lieu = null;
      }
    }
    if (contact_email) event.contact_email = contact_email;
    if (max_participants) {
      const maxParticipants = parseInt(max_participants, 10);
      if (isNaN(maxParticipants) || maxParticipants <= 0) {
        return res.status(400).json({ message: "Le nombre maximum de participants doit être un entier positif" });
      }
      if (maxParticipants < event.participants.length) {
        return res.status(400).json({ message: "Le nombre maximum ne peut pas être inférieur au nombre actuel de participants" });
      }
      event.max_participants = maxParticipants;
    }

    const updatedEvent = await event.save();
    console.log(`✅ Événement "${title || event.title}" mis à jour avec succès.`);
    res.status(200).json({ message: "Événement mis à jour avec succès", data: updatedEvent });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l’événement:", error.stack);
    res.status(500).json({ message: "Erreur serveur interne", error: error.message });
  } finally {
    console.timeEnd("updateEvent");
  }
};

// Supprimer un événement
exports.deleteEvent = async (req, res) => {
  console.time("deleteEvent");
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });
    if (event.created_by.toString() !== req.userId) {
      return res.status(403).json({ message: "Vous n’êtes pas autorisé à supprimer cet événement" });
    }

    await Event.findByIdAndDelete(id);
    console.log(`✅ Événement avec ID "${id}" supprimé avec succès.`);
    res.status(200).json({ message: "Événement supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression de l’événement:", error.stack);
    res.status(500).json({ message: "Erreur serveur interne", error: error.message });
  } finally {
    console.timeEnd("deleteEvent");
  }
};

// Participer à un événement
exports.participate = async (req, res) => {
  console.time("participate");
  try {
    const { eventId } = req.params;
    const userId = req.userId;

    console.log(`Tentative de participation de l'utilisateur ${userId} à l'événement ${eventId}`);

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const [user, event] = await Promise.all([
      User.findById(userId).select("role username participatedEvents"),
      Event.findById(eventId),
    ]);

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });

    // Restriction au rôle "student" (modifiable si nécessaire)
    if (user.role !== "student") {
      return res.status(403).json({ message: "Seuls les étudiants peuvent participer aux événements" });
    }

    if (event.status === "canceled" || event.status === "past") {
      return res.status(400).json({ message: "Impossible de participer à un événement annulé ou terminé" });
    }

    if (event.participants.includes(userId)) {
      console.log(`Utilisateur ${userId} participe déjà à l'événement ${eventId}`);
      return res.status(400).json({ message: "Vous participez déjà à cet événement" });
    }

    if (event.max_participants && event.participants.length >= event.max_participants) {
      return res.status(400).json({ message: "Cet événement a atteint sa limite de participants" });
    }

    event.participants.push(userId);
    if (!user.participatedEvents.includes(eventId)) user.participatedEvents.push(eventId);
    await Promise.all([event.save(), user.save()]);

    console.log(`✅ ${user.username} a rejoint l'événement "${event.title}". Participants: ${event.participants.length}`);
    res.status(200).json({
      message: "Participation enregistrée avec succès",
      event: event.title,
      participantsCount: event.participants.length,
    });
  } catch (error) {
    console.error("Erreur lors de la participation:", error.stack);
    res.status(500).json({ message: "Erreur serveur interne", error: error.message });
  } finally {
    console.timeEnd("participate");
  }
};

// Vérifier la participation
exports.checkParticipation = async (req, res) => {
  console.time("checkParticipation");
  try {
    const { eventId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const event = await Event.findById(eventId).select("participants");
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });

    const isParticipating = event.participants.includes(userId);
    console.log(`Participation de ${userId} à ${eventId}: ${isParticipating}`);
    res.status(200).json({ isParticipating });
  } catch (error) {
    console.error("Erreur lors de la vérification de la participation:", error.stack);
    res.status(500).json({ message: "Erreur serveur interne", error: error.message });
  } finally {
    console.timeEnd("checkParticipation");
  }
};

// Générer un PDF pour un événement
exports.generateEventPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate("created_by", "username email")
      .populate("participants", "username");

    if (!event) return res.status(404).json({ message: "Événement non trouvé" });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${event.title}_Details.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text("Event Details", { align: "center" }).moveDown(1);
    doc.fontSize(14).text(`Title: ${event.title || "N/A"}`, { align: "left" }).moveDown(0.5);
    doc.fontSize(12).text(`Description: ${event.description || "N/A"}`, { align: "left" }).moveDown(0.5);

    const formatDate = (date) => date?.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" }) || "N/A";
    doc.fontSize(12).text(`Start Date: ${formatDate(event.start_date)}`, { align: "left" }).moveDown(0.5);
    doc.fontSize(12).text(`End Date: ${formatDate(event.end_date)}`, { align: "left" }).moveDown(0.5);
    doc.fontSize(12).text(`Time: ${event.heure || "N/A"}`, { align: "left" }).moveDown(0.5);
    doc.fontSize(12).text(`Event Type: ${event.event_type === "in-person" ? "In-Person" : "Online"}`, { align: "left" }).moveDown(0.5);

    if (event.event_type === "in-person") {
      doc.fontSize(12).text(`Location: ${event.localisation || "N/A"}`, { align: "left" }).moveDown(0.5);
      doc.fontSize(12).text(`Venue: ${event.lieu || "N/A"}`, { align: "left" });
    } else {
      doc.fontSize(12).text(`Online Link: ${event.online_link || "N/A"}`, { align: "left" });
    }
    doc.moveDown(0.5);

    doc.fontSize(12).text(`Organizer: ${event.created_by?.username || "Unknown"}`, { align: "left" }).moveDown(0.5);
    doc.fontSize(12).text(`Contact: ${event.contact_email || "N/A"}`, { align: "left" }).moveDown(0.5);
    doc.fontSize(12).text(`Participants: ${event.participants.length} / ${event.max_participants || "No limit"}`, { align: "left" });

    if (event.participants.length > 0) {
      doc.moveDown(0.5).fontSize(12).text("Participants List:", { align: "left" });
      event.participants.forEach((participant, index) => {
        doc.fontSize(10).text(`${index + 1}. ${participant.username}`, { align: "left" });
      });
    }

    doc.end();
    console.log(`PDF généré avec succès pour l'événement: ${event.title}`);
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error.stack);
    res.status(500).json({ message: "Erreur lors de la génération du PDF", error: error.message });
  }
};

module.exports = exports;