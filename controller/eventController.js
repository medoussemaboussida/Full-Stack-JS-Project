const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Event = require("../model/event");
const User = require("../model/user");
const Association = require("../model/association"); // Ajouter cette ligne
const Ticket = require("../model/Ticket"); // Ajouter cette ligne
const multer = require("multer");
const path = require("path");
const crypto = require('crypto');
const PDFDocument = require("pdfkit");
const axios = require("axios");
const sendEmail = require('../utils/emailSender');
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
        contact_email, event_type, online_link, max_participants, hasPartners
      } = req.body;

      console.log("Request body:", req.body); // Log pour débogage

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

      const wantsPartners = hasPartners === true || hasPartners === "true";
      console.log("wantsPartners:", wantsPartners); // Log pour vérifier

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

      const user = await User.findById(req.userId, "role username email").lean();
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "association_member") {
        return res.status(403).json({ message: "Only association members can create events" });
      }

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

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
        coordinates,
        hasPartners: wantsPartners
      });

      const savedEvent = await newEvent.save();
      console.log(`✅ Event "${title}" created successfully. ID: ${savedEvent._id}`);

      // Si l'événement recherche des partenaires, envoyer les emails
      if (wantsPartners) {
        const associationMembers = await User.find({ 
          role: "association_member", 
          _id: { $ne: req.userId } // Exclure le créateur
        });
        console.log("Association members found:", associationMembers.length);

        if (associationMembers.length > 0) {
          const eventLink = `http://localhost:3000/event/${savedEvent._id}`; // Ajustez selon votre frontend
          const subject = "New Event Added - Partnership Opportunity";
          const htmlContent = `
            <h2>New Event Created!</h2>
            <p>Hello Association Member,</p>
            <p>A new event has been added by ${user.username} on our platform and is seeking partners:</p>
            <ul>
              <li><strong>Title:</strong> ${title}</li>
              <li><strong>Description:</strong> ${description}</li>
              <li><strong>Date:</strong> ${eventStartDate.toLocaleDateString()} - ${eventEndDate.toLocaleDateString()}</li>
              <li><strong>Time:</strong> ${heure}</li>
              ${event_type === "in-person" ? `<li><strong>Location:</strong> ${localisation}, ${lieu}</li>` : `<li><strong>Online Link:</strong> ${online_link}</li>`}
            </ul>
            <p>If you're interested in partnering, please review the event details:</p>
            <a href="${eventLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #0ea5e6; color: #fff; text-decoration: none; border-radius: 5px;">
              View Event
            </a>
            <p>Contact the organizer at: ${contact_email}</p>
            <p>Stay connected for more updates!</p>
          `;

          const emailPromises = associationMembers.map(member =>
            sendEmail(member.email, subject, htmlContent)
              .catch(err => console.error(`Erreur lors de l’envoi à ${member.email} :`, err))
          );

          await Promise.all(emailPromises);
          console.log(`Emails envoyés à ${associationMembers.length} membres de l'association.`);
        } else {
          console.log("Aucun membre de l'association trouvé pour envoyer des emails.");
        }
      } else {
        console.log("Aucun email envoyé (hasPartners est false).");
      }

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
    const { title, description, start_date, end_date, localisation, lieu, heure, 
            contact_email, event_type, online_link, max_participants, hasPartners } = req.body;

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
        if (localisation && localisation.trim() !== event.localisation) {
          const coordinates = await geocodeAddress(localisation.trim());
          event.coordinates = coordinates;
        }
      } else if (event_type === "online") {
        event.online_link = online_link ? online_link.trim() : event.online_link;
        event.localisation = null;
        event.lieu = null;
        event.coordinates = { lat: null, lng: null };
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
    if (typeof hasPartners !== 'undefined') {
      event.hasPartners = hasPartners === true || hasPartners === "true";
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
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Récupérer l'événement avec validation minimale
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Corriger les champs participants et partners si nécessaire
    if (!Array.isArray(event.participants)) {
      console.warn(`Fixing participants field for event ${eventId}: was ${typeof event.participants}`);
      event.participants = [];
    }
    if (!Array.isArray(event.partners)) {
      console.warn(`Fixing partners field for event ${eventId}: was ${typeof event.partners}`);
      event.partners = [];
    }

    // Enregistrer les corrections avant de continuer
    await event.save();

    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (event.participants.some((id) => id.equals(userObjectId))) {
      return res.status(400).json({ message: "You are already participating" });
    }

    if (event.max_participants && event.participants.length >= event.max_participants) {
      return res.status(400).json({ message: "Event has reached maximum participants" });
    }

    event.participants.push(userObjectId);
    await event.save();

    res.status(200).json({
      message: "You have successfully joined the event",
      participantsCount: event.participants.length,
    });
  } catch (error) {
    console.error("Erreur lors de la participation:", {
      message: error.message,
      stack: error.stack,
    });
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
    doc.fontSize(12).text(`Accepts Partners: ${event.hasPartners ? "Yes" : "No"}`, { align: "left" }).moveDown(0.5);

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

exports.participateAsPartner = async (req, res) => {
  console.time("participateAsPartner");
  try {
    const { eventId } = req.params;
    const userId = req.userId;
    let { association_id } = req.body;

    console.log(`Participate as Partner - Event ID: ${eventId}, User ID: ${userId}, Association ID: ${association_id || "none"}`);

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.log("Invalid event ID provided");
      return res.status(400).json({ message: "Invalid event ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log("Invalid user ID provided");
      return res.status(400).json({ message: "Invalid user ID" });
    }
    if (association_id && !mongoose.Types.ObjectId.isValid(association_id)) {
      console.log("Invalid association ID provided");
      return res.status(400).json({ message: "Invalid association ID" });
    }

    // Check user
    const user = await User.findById(userId);
    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }
    console.log("User details:", { role: user.role, association_id: user.association_id?.toString() || "none" });
    if (user.role !== "association_member") {
      console.log("User is not an association member");
      return res.status(403).json({ message: "Only association members can join as partners" });
    }

    // Retrieve association_id
    if (!association_id) {
      if (user.association_id) {
        association_id = user.association_id;
        console.log("Using user.association_id:", association_id.toString());
      } else {
        console.log("Querying Association for created_by:", userId);
        const association = await Association.findOne({ created_by: userId });
        if (association) {
          association_id = association._id;
          user.association_id = association_id;
          await user.save();
          console.log("Linked user to association:", association_id.toString());
        } else {
          console.log("No association found for user");
          return res.status(400).json({ message: "No association linked to this user. Please create an association first." });
        }
      }
    }

    // Verify association exists and is linked to user
    const association = await Association.findById(association_id);
    if (!association) {
      console.log("Association not found for ID:", association_id);
      return res.status(404).json({ message: "Association not found" });
    }
    if (association.created_by.toString() !== userId) {
      console.log("Association not created by user");
      return res.status(403).json({ message: "You are not authorized to use this association" });
    }

    // Check event
    const event = await Event.findById(eventId);
    if (!event) {
      console.log(`Event ${eventId} not found`);
      return res.status(404).json({ message: "Event not found" });
    }
    if (!event.hasPartners) {
      console.log("Event does not accept partners");
      return res.status(400).json({ message: "This event does not accept partners" });
    }

    // Ensure partners is an array
    if (!Array.isArray(event.partners)) {
      console.log(`Fixing partners field for event ${eventId}: was ${typeof event.partners}`);
      event.partners = [];
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (event.partners.includes(userObjectId)) {
      console.log(`User ${userId} is already a partner for event ${eventId}`);
      return res.status(400).json({ message: "You are already a partner for this event" });
    }

    // Add user to partners
    event.partners.push(userObjectId);
    await event.save();

    // Update user
    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    user.partneredEvents = user.partneredEvents || [];
    if (!user.partneredEvents.some((id) => id.equals(eventObjectId))) {
      user.partneredEvents.push(eventObjectId);
    }
    user.association_id = new mongoose.Types.ObjectId(association_id);
    await user.save();

    console.log(`User ${userId} successfully joined event ${eventId} as partner with association ${association_id}`);
    res.status(200).json({ message: "Joined as partner successfully" });
  } catch (error) {
    console.error("Error in participateAsPartner:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Internal server error", error: error.message });
  } finally {
    console.timeEnd("participateAsPartner");
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


exports.cancelPartnerParticipation = async (req, res) => {
  console.time("cancelPartnerParticipation");
  try {
    const { eventId } = req.params;
    const userId = req.userId;

    console.log(`Cancel Partner Participation - Event ID: ${eventId}, User ID: ${userId}`);

    // Validate inputs
    if (!userId) {
      console.log("No userId provided in request");
      return res.status(401).json({ message: "Authentication required" });
    }
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.log(`Invalid event ID: ${eventId}`);
      return res.status(400).json({ message: "Invalid event ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Invalid user ID: ${userId}`);
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.log(`Database not connected: readyState=${mongoose.connection.readyState}`);
      return res.status(500).json({ message: "Database connection error" });
    }

    // Fetch user
    const user = await User.findById(userId).exec();
    if (!user) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role !== "association_member") {
      console.log(`User is not an association member: role=${user.role}`);
      return res.status(403).json({ message: "Only association members can cancel partner participation" });
    }

    // Fetch event
    const event = await Event.findById(eventId).exec();
    if (!event) {
      console.log(`Event not found: ${eventId}`);
      return res.status(404).json({ message: "Event not found" });
    }
    if (!event.hasPartners) {
      console.log(`Event does not accept partners: ${eventId}`);
      return res.status(400).json({ message: "This event does not accept partners" });
    }

    // Ensure partners is an array
    if (!Array.isArray(event.partners)) {
      console.warn(`Fixing partners field for event ${eventId}: was ${typeof event.partners}`);
      event.partners = [];
    }

    // Ensure partneredEvents is an array
    if (!Array.isArray(user.partneredEvents)) {
      console.warn(`Fixing partneredEvents field for user ${userId}: was ${typeof user.partneredEvents}`);
      user.partneredEvents = [];
    }

    // Check if user is a partner
    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (!event.partners.some((id) => id.equals(userObjectId))) {
      console.log(`User ${userId} is not a partner for event ${eventId}`);
      return res.status(400).json({ message: "You are not a partner for this event" });
    }

    // Remove user from event partners
    event.partners = event.partners.filter((id) => !id.equals(userObjectId));

    // Remove event from user partneredEvents
    const eventObjectId = new mongoose.Types.ObjectId(eventId);
    user.partneredEvents = user.partneredEvents.filter((id) => !id.equals(eventObjectId));

    // Save both documents in a transaction to ensure consistency
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await event.save({ session });
        await user.save({ session });
      });
      console.log(`User ${userId} successfully canceled partnership for event ${eventId}`);
      res.status(200).json({ message: "Partnership canceled successfully" });
    } catch (error) {
      console.error("Transaction error:", error.message);
      throw new Error("Failed to update partnership status");
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Error in cancelPartnerParticipation:", {
      message: error.message,
      stack: error.stack,
      eventId: req.params.eventId,
      userId: req.userId,
    });
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    console.timeEnd("cancelPartnerParticipation");
  }
};
exports.checkPartnerParticipation = async (req, res) => {
  console.time("checkPartnerParticipation");
  try {
    const { eventId } = req.params;
    const userId = req.userId;

    console.log(`Checking partner participation for event ${eventId} by user ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      console.log(`Invalid event ID: ${eventId}`);
      return res.status(400).json({ message: "Invalid event ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log(`Invalid user ID: ${userId}`);
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const event = await Event.findById(eventId).exec();
    if (!event) {
      console.log(`Event not found: ${eventId}`);
      return res.status(404).json({ message: "Event not found" });
    }

    if (!Array.isArray(event.partners)) {
      console.warn(`Fixing partners field for event ${eventId}: was ${typeof event.partners}`);
      event.partners = [];
      await event.save();
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const isPartner = event.partners.some((id) => id.equals(userObjectId));

    console.log(`User ${userId} partner status for event ${eventId}: ${isPartner}`);
    res.status(200).json({ isPartner });
  } catch (error) {
    console.error("Error in checkPartnerParticipation:", {
      message: error.message,
      stack: error.stack,
      eventId: req.params.eventId,
      userId: req.userId,
    });
    res.status(500).json({
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    console.timeEnd("checkPartnerParticipation");
  }
};
////kghir badelt check partner , bouton join now et cancel 








exports.likeEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const hasLiked = event.likes.includes(userId);
    if (hasLiked) {
      event.likes = event.likes.filter((uid) => uid !== userId);
    } else {
      event.likes.push(userId);
      event.dislikes = event.dislikes.filter((uid) => uid !== userId); // Supprimer dislike si existant
    }
    await event.save();

    res.status(200).json({ message: hasLiked ? "Like removed" : "Event liked", liked: !hasLiked, likeCount: event.likes.length });
  } catch (error) {
    console.error("Error in likeEvent:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.dislikeEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const hasDisliked = event.dislikes.includes(userId);
    if (hasDisliked) {
      event.dislikes = event.dislikes.filter((uid) => uid !== userId);
    } else {
      event.dislikes.push(userId);
      event.likes = event.likes.filter((uid) => uid !== userId); // Supprimer like si existant
    }
    await event.save();

    res.status(200).json({ message: hasDisliked ? "Dislike removed" : "Event disliked", disliked: !hasDisliked, dislikeCount: event.dislikes.length });
  } catch (error) {
    console.error("Error in dislikeEvent:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.favoriteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isFavorite = event.favorites.includes(userId);
    if (isFavorite) {
      event.favorites = event.favorites.filter((uid) => uid !== userId);
    } else {
      event.favorites.push(userId);
    }
    await event.save();

    res.status(200).json({ message: isFavorite ? "Removed from favorites" : "Added to favorites", isFavorite: !isFavorite });
  } catch (error) {
    console.error("Error in favoriteEvent:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.checkLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const liked = event.likes.includes(userId);
    res.status(200).json({ liked, likeCount: event.likes.length });
  } catch (error) {
    console.error("Error in checkLike:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.checkDislike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const disliked = event.dislikes.includes(userId);
    res.status(200).json({ disliked, dislikeCount: event.dislikes.length });
  } catch (error) {
    console.error("Error in checkDislike:", error.stack);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.checkFavorite = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.userId; // Extrait du middleware d'authentification

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: "Invalid event ID" });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const isFavorite = event.favorites.includes(userId);
    res.status(200).json({ isFavorite });
  } catch (error) {
    console.error("Error in checkFavorite:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};







module.exports = exports;