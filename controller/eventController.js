const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Event = require("../model/event");
const User = require("../model/user");
const multer = require("multer");
const path = require("path");
const PDFDocument = require("pdfkit");
const axios = require("axios");

require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "randa";
console.log("JWT_SECRET dans eventController:", JWT_SECRET);

// Clé API Google Maps depuis .env
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  console.warn("⚠️ GOOGLE_MAPS_API_KEY is not set in .env");
}

// Configuration de Multer
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
    else cb(new Error("Only JPEG, JPG, PNG, and GIF images are allowed!"));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single("image");

// Fonction pour géocoder une adresse avec Google Maps
const geocodeAddress = async (address) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn("Geocoding skipped: No Google Maps API key provided");
    return { lat: null, lng: null };
  }

  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const { results, status } = response.data;
    if (status === "OK" && results.length > 0) {
      const { lat, lng } = results[0].geometry.location;
      console.log(`Geocoded "${address}" to lat: ${lat}, lng: ${lng}`);
      return { lat, lng };
    } else {
      console.warn(`Geocoding failed for "${address}": ${status}`);
      return { lat: null, lng: null };
    }
  } catch (error) {
    console.error("Error during geocoding:", error.message);
    return { lat: null, lng: null };
  }
};

// Ajouter un événement
exports.addEvent = (req, res) => {
  console.time("addEvent");
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer Error:", err.message);
      return res.status(400).json({ message: err.message });
    }

    try {
      const {
        title, description, start_date, end_date, localisation, lieu, heure,
        contact_email, event_type, online_link, max_participants
      } = req.body;

      const requiredFields = { title, description, start_date, end_date, heure, contact_email, event_type };
      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value || typeof value !== "string" || value.trim() === "")
        .map(([key]) => key);
      if (missingFields.length) {
        return res.status(400).json({ message: `Missing or invalid required fields: ${missingFields.join(", ")}` });
      }

      if (event_type === "in-person" && (!localisation || !lieu)) {
        return res.status(400).json({ message: "Location and venue are required for in-person events" });
      }
      if (event_type === "online" && !online_link) {
        return res.status(400).json({ message: "Online link is required for online events" });
      }

      const eventStartDate = new Date(`${start_date}T${heure}:00Z`);
      const eventEndDate = new Date(`${end_date}T${heure}:00Z`);
      if (isNaN(eventStartDate.getTime()) || isNaN(eventEndDate.getTime())) {
        return res.status(400).json({ message: "Invalid date or time format (expected: YYYY-MM-DD and HH:MM)" });
      }
      if (eventEndDate <= eventStartDate) {
        return res.status(400).json({ message: "End date must be after start date" });
      }

      const maxParticipants = max_participants ? parseInt(max_participants, 10) : null;
      if (max_participants && (isNaN(maxParticipants) || maxParticipants <= 0)) {
        return res.status(400).json({ message: "Max participants must be a positive integer" });
      }

      const user = await User.findById(req.userId, "role").lean();
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "association_member") {
        return res.status(403).json({ message: "Only association members can create events" });
      }

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      // Géocodage pour les événements en personne
      let coordinates = { lat: null, lng: null };
      if (event_type === "in-person" && localisation) {
        coordinates = await geocodeAddress(localisation.trim());
      }

      const newEvent = new Event({
        title: title.trim(),
        description: description.trim(),
        start_date: eventStartDate,
        end_date: eventEndDate,
        localisation: event_type === "in-person" ? localisation.trim() : null,
        lieu: event_type === "in-person" ? lieu.trim() : null,
        heure: heure.trim(),
        contact_email: contact_email.trim(),
        event_type,
        online_link: event_type === "online" ? online_link.trim() : null,
        imageUrl,
        created_by: req.userId,
        max_participants: maxParticipants,
        participants: [],
        status: "upcoming",
        coordinates, // Ajout des coordonnées géocodées
      });

      const savedEvent = await newEvent.save();
      console.log(`✅ Event "${title}" created successfully. ID: ${savedEvent._id}`);
      res.status(201).json({ message: "Event added successfully", data: savedEvent });
    } catch (error) {
      console.error("Error adding event:", error.stack);
      res.status(500).json({ message: "Internal server error", error: error.message });
    } finally {
      console.timeEnd("addEvent");
    }
  });
};

// Récupérer tous les événements pour le frontend (seulement approuvés)
exports.getEvents = async (req, res) => {
  console.time("getEvents");
  try {
    const currentDate = new Date();
    const events = await Event.find({
      $and: [
        { isApproved: true },
        {
          $or: [
            { status: { $in: ["upcoming", "ongoing"] } },
            { end_date: { $gte: currentDate } },
          ],
        },
      ],
    })
      .sort({ start_date: 1 })
      .populate("created_by", "username")
      .populate("participants", "username")
      .lean();

    console.log("Events retrieved:", events.length);
    console.log("IDs des événements récupérés :", events.map(e => e._id.toString()));
    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    console.timeEnd("getEvents");
  }
};

// Récupérer tous les événements pour le backoffice (tous, approuvés ou non)
exports.getAllEventsForAdmin = async (req, res) => {
  console.time("getAllEventsForAdmin");
  try {
    const events = await Event.find()
      .sort({ start_date: 1 })
      .populate("created_by", "username")
      .populate("participants", "username")
      .lean();

    console.log("Admin events retrieved:", events.length);
    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching all events for admin:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    console.timeEnd("getAllEventsForAdmin");
  }
};

// Récupérer un événement par ID
exports.getEventById = async (req, res) => {
  console.time("getEventById");
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const event = await Event.findById(id)
      .populate("created_by", "username email imageUrl")
      .populate("participants", "username")
      .lean();

    if (!event) return res.status(404).json({ message: "Event not found" });

    console.log(`Event retrieved: ${event.title}`);
    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching event:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
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
      return res.status(400).json({ message: "Invalid ID" });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.created_by.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to update this event" });
    }

    if (title) event.title = title.trim();
    if (description) event.description = description.trim();
    if (start_date && heure) {
      const eventStartDate = new Date(`${start_date}T${heure}:00Z`);
      if (isNaN(eventStartDate.getTime())) {
        return res.status(400).json({ message: "Invalid start date or time format" });
      }
      event.start_date = eventStartDate;
    }
    if (end_date && heure) {
      const eventEndDate = new Date(`${end_date}T${heure}:00Z`);
      if (isNaN(eventEndDate.getTime())) {
        return res.status(400).json({ message: "Invalid end date or time format" });
      }
      event.end_date = eventEndDate;
    }
    if (event.end_date <= event.start_date) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    if (heure) event.heure = heure.trim();
    if (event_type) {
      event.event_type = event_type;
      if (event_type === "in-person") {
        event.localisation = localisation ? localisation.trim() : event.localisation;
        event.lieu = lieu ? lieu.trim() : event.lieu;
        event.online_link = null;
        if (!event.localisation || !event.lieu) {
          return res.status(400).json({ message: "Location and venue are required for in-person events" });
        }
        // Mise à jour des coordonnées si localisation change
        if (localisation && localisation.trim() !== event.localisation) {
          const coordinates = await geocodeAddress(localisation.trim());
          event.coordinates = coordinates;
        }
      } else if (event_type === "online") {
        event.online_link = online_link ? online_link.trim() : event.online_link;
        event.localisation = null;
        event.lieu = null;
        event.coordinates = { lat: null, lng: null }; // Réinitialiser les coordonnées pour les événements en ligne
        if (!event.online_link) {
          return res.status(400).json({ message: "Online link is required for online events" });
        }
      }
    }
    if (contact_email) event.contact_email = contact_email.trim();
    if (max_participants) {
      const maxParticipants = parseInt(max_participants, 10);
      if (isNaN(maxParticipants) || maxParticipants <= 0) {
        return res.status(400).json({ message: "Max participants must be a positive integer" });
      }
      if (maxParticipants < event.participants.length) {
        return res.status(400).json({ message: "Max participants cannot be less than current participants" });
      }
      event.max_participants = maxParticipants;
    }

    const updatedEvent = await event.save();
    console.log(`✅ Event "${title || event.title}" updated successfully`);
    res.status(200).json({ message: "Event updated successfully", data: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
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
      return res.status(400).json({ message: "Invalid ID" });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.created_by.toString() !== req.userId) {
      return res.status(403).json({ message: "You are not authorized to delete this event" });
    }

    await Event.findByIdAndDelete(id);
    console.log(`✅ Event with ID "${id}" deleted successfully`);
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    console.timeEnd("deleteEvent");
  }
};

// Approuver ou désactiver un événement
exports.toggleEventApproval = async (req, res) => {
  console.time("toggleEventApproval");
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const user = await User.findById(req.userId, "role").lean();
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can approve/disable events" });
    }

    event.isApproved = isApproved;
    const updatedEvent = await event.save();

    console.log(`✅ Event "${event.title}" approval status updated to ${isApproved}`);
    res.status(200).json({ message: "Event approval status updated", data: updatedEvent });
  } catch (error) {
    console.error("Error toggling event approval:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    console.timeEnd("toggleEventApproval");
  }
};

// Participer à un événement
exports.participate = async (req, res) => {
  console.time("participate");
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    let decoded;
    const possibleSecrets = [process.env.JWT_SECRET, 'randa', 'token'];
    for (const secret of possibleSecrets) {
      try {
        decoded = jwt.verify(token, secret);
        break;
      } catch (err) {
        continue;
      }
    }

    if (!decoded) return res.status(403).json({ message: "Invalid token" });

    const userId = decoded.id;
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.participants.includes(userId)) {
      return res.status(400).json({ message: "You are already participating" });
    }

    if (event.max_participants && event.participants.length >= event.max_participants) {
      return res.status(400).json({ message: "Event has reached maximum participants" });
    }

    event.participants.push(userId);
    await event.save();

    res.status(200).json({ 
      message: "You have successfully joined the event", 
      participantsCount: event.participants.length 
    });
  } catch (error) {
    console.error("Erreur lors de la participation:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    console.timeEnd("participate");
  }
};

// Annuler la participation à un événement
exports.cancelParticipation = async (req, res) => {
  console.time("cancelParticipation");
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    let decoded;
    const possibleSecrets = [process.env.JWT_SECRET, "randa", "token"];
    for (const secret of possibleSecrets) {
      try {
        decoded = jwt.verify(token, secret);
        break;
      } catch (err) {
        continue;
      }
    }

    if (!decoded) return res.status(403).json({ message: "Invalid token" });

    const userId = decoded.id;
    const eventId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!event.participants.includes(userId)) {
      return res.status(400).json({ message: "You are not participating in this event" });
    }

    event.participants = event.participants.filter((id) => id.toString() !== userId);
    await event.save();

    res.status(200).json({
      message: "You have successfully canceled your participation",
      participantsCount: event.participants.length,
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation de la participation:", error.message);
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  } finally {
    console.timeEnd("cancelParticipation");
  }
};

// Vérifier la participation
exports.checkParticipation = async (req, res) => {
  console.time("checkParticipation");
  try {
    const { eventId } = req.params;
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const event = await Event.findById(eventId).select("participants");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isParticipating = event.participants.includes(userId);
    console.log(`Participation of ${userId} in ${eventId}: ${isParticipating}`);
    res.status(200).json({ isParticipating });
  } catch (error) {
    console.error("Error checking participation:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
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

    if (!event) return res.status(404).json({ message: "Event not found" });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, "_")}_Details.pdf"`);
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
      doc.fontSize(12).text(`Venue: ${event.lieu || "N/A"}`, { align: "left" }).moveDown(0.5);
      if (event.coordinates?.lat && event.coordinates?.lng) {
        doc.fontSize(12).text(`Coordinates: Lat ${event.coordinates.lat}, Lng ${event.coordinates.lng}`, { align: "left" });
      }
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
    console.log(`PDF generated successfully for event: ${event.title}`);
  } catch (error) {
    console.error("Error generating PDF:", error.stack);
    res.status(500).json({ message: "Error generating PDF", error: error.message });
  }
};

module.exports = exports;