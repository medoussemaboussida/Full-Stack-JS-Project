const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 1000
    },
    start_date: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value >= new Date(); // Assure que la date de début est dans le futur ou aujourd'hui
            },
            message: "La date de début ne peut pas être dans le passé."
        }
    },
    end_date: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value >= this.start_date; // Assure que la date de fin est après ou égale à la date de début
            },
            message: "La date de fin doit être postérieure ou égale à la date de début."
        }
    },
    localisation: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 200,
        required: function() {
            return this.event_type === 'in-person'; // Obligatoire pour les événements en personne
        }
    },
    lieu: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 200,
        required: function() {
            return this.event_type === 'in-person'; // Obligatoire pour les événements en personne
        }
    },
    heure: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Format HH:MM (24h)
        trim: true
    },
    contact_email: {
        type: String,
        required: true,
        trim: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        maxlength: 100
    },
    event_type: {
        type: String,
        required: true,
        enum: ['in-person', 'online'],
        default: 'in-person'
    },
    online_link: {
        type: String,
        trim: true,
        match: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, // Validation d'URL
        required: function() {
            return this.event_type === 'online'; // Obligatoire pour les événements en ligne
        }
    },
    imageUrl: {
        type: String,
        trim: true,
        default: null
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Référence aux utilisateurs (étudiants) qui participent
    }],
    max_participants: {
        type: Number,
        min: 1,
        default: null, // Null signifie pas de limite
        validate: {
            validator: function(value) {
                return value === null || value > 0; // Accepte null ou un nombre positif
            },
            message: "Le nombre maximum de participants doit être un entier positif ou non défini (null)."
        }
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'past', 'canceled'],
        default: 'upcoming'
    },
    isApproved: {
        type: Boolean,
        default: false // Par défaut, un événement n'est pas approuvé
    },
    coordinates: {
        lat: {
            type: Number,
            default: null // Latitude, null par défaut si non géocodée
        },
        lng: {
            type: Number,
            default: null // Longitude, null par défaut si non géocodée
        }
    },
    likes: { type: [String], default: [] },      // Liste des utilisateurs ayant aimé
  dislikes: { type: [String], default: [] },   // Liste des utilisateurs ayant désapprouvé
  favorites: { type: [String], default: [] },
    hasPartners: {
        type: Boolean,
        default: false // Par défaut, pas de partenaires
    }
}, {
    timestamps: true // Ajoute createdAt et updatedAt automatiquement
});

// Middleware pour mettre à jour le statut de l'événement
eventSchema.pre('save', function(next) {
    const now = new Date();
    if (this.start_date > now) {
        this.status = 'upcoming';
    } else if (this.start_date <= now && this.end_date >= now) {
        this.status = 'ongoing';
    } else if (this.end_date < now) {
        this.status = 'past';
    }
    next();
});

module.exports = mongoose.model('Event', eventSchema);