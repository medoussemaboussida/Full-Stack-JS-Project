const Event = require('../model/event');
const User = require('../model/user');
const multer = require('multer');
const path = require('path');

// 📌 Configuration de Multer (optionnel, pour une future image d'événement)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error("Seules les images JPEG, JPG et PNG sont autorisées !"));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
}).single("image_event");

// Ajouter un événement
exports.addEvent = async (req, res) => {
    try {
        const { 
            Name_event, 
            Description_event, 
            contact_email_event, 
            support_type_event, 
            Localisation_event, // Corrigé pour correspondre au modèle
            Date_event, 
            Time_event, // Nouveau champ
            associations 
        } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        if (user.role !== 'association_member') {
            return res.status(403).json({ message: "Seuls les membres associatifs peuvent ajouter un événement" });
        }

        // Validation des champs obligatoires
        if (!Name_event || !Description_event || !contact_email_event || !support_type_event || !Localisation_event || !Date_event || !Time_event) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires" });
        }

        const existingEvent = await Event.findOne({ Name_event });
        if (existingEvent) {
            return res.status(409).json({ message: "Un événement avec ce nom existe déjà" });
        }

        const newEvent = new Event({
            Name_event,
            Description_event,
            contact_email_event,
            support_type_event,
            Localisation_event,
            Date_event,
            Time_event, // Ajout du champ Time_event
            user_id: req.user.id,
            associations: associations ? JSON.parse(associations) : [],
        });

        await newEvent.save();

        res.status(201).json({ message: "Événement ajouté avec succès", data: newEvent });
    } catch (error) {
        console.error("Erreur lors de l'ajout de l'événement :", error);
        res.status(500).json({ message: "Erreur serveur interne", error: error.message });
    }
};

// Récupérer tous les événements avec les logos des associations
module.exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate("user_id", "username")
            .populate("associations", "Name_association logo_association")
            .sort({ Date_event: 1 });

        res.status(200).json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Récupérer un événement par ID avec les logos des associations
module.exports.getEventById = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findById(id)
            .populate("user_id", "username")
            .populate("associations", "Name_association logo_association");

        if (!event) {
            return res.status(404).json({ message: "Événement non trouvé" });
        }

        res.status(200).json(event);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Mettre à jour un événement par ID
module.exports.updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            Name_event, 
            Description_event, 
            contact_email_event, 
            support_type_event, 
            Localisation_event, 
            Date_event, 
            Time_event, // Nouveau champ
            associations 
        } = req.body;

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: "Événement non trouvé" });
        }

        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'association_member') {
            return res.status(403).json({ message: "Seuls les membres associatifs peuvent modifier un événement" });
        }

        if (Name_event) event.Name_event = Name_event;
        if (Description_event) event.Description_event = Description_event;
        if (contact_email_event) event.contact_email_event = contact_email_event;
        if (support_type_event) event.support_type_event = support_type_event;
        if (Localisation_event) event.Localisation_event = Localisation_event;
        if (Date_event) event.Date_event = Date_event;
        if (Time_event) event.Time_event = Time_event; // Mise à jour du champ Time_event
        if (associations) event.associations = JSON.parse(associations);

        const updatedEvent = await event.save();

        res.status(200).json(updatedEvent);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Supprimer un événement par ID
module.exports.deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        const event = await Event.findById(id);
        if (!event) {
            return res.status(404).json({ message: "Événement non trouvé" });
        }

        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'association_member') {
            return res.status(403).json({ message: "Seuls les membres associatifs peuvent supprimer un événement" });
        }

        await Event.findByIdAndDelete(id);

        res.status(200).json({ message: "Événement supprimé avec succès" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};