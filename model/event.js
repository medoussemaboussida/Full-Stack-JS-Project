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
                return value >= new Date();
            },
            message: "La date de début ne peut pas être dans le passé."
        }
    },
    end_date: {
        type: Date,
        required: true,
        validate: {
            validator: function(value) {
                return value >= this.start_date;
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
            return this.event_type === 'in-person';
        }
    },
    lieu: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 200,
        required: function() {
            return this.event_type === 'in-person';
        }
    },
    heure: {
        type: String,
        required: true,
        match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
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
        match: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
        required: function() {
            return this.event_type === 'online';
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
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    partners: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
            max_participants: {
        type: Number,
        min: 1,
        default: null,
        validate: {
            validator: function(value) {
                return value === null || value > 0;
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
        default: false
    },
    coordinates: {
        lat: {
            type: Number,
            default: null,
            validate: {
                validator: function(value) {
                    return value === null || (value >= -90 && value <= 90);
                },
                message: "La latitude doit être entre -90 et 90 ou null"
            }
        },
        lng: {
            type: Number,
            default: null,
            validate: {
                validator: function(value) {
                    return value === null || (value >= -180 && value <= 180);
                },
                message: "La longitude doit être entre -180 et 180 ou null"
            }
        }
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
              hasPartners: {
          type: Boolean,
          default: false // Par défaut, pas de partenaires
      }
}, {
    timestamps: true
});

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
// Ensure partners is always an array
eventSchema.pre('save', function(next) {
    if (!Array.isArray(this.partners)) {
      this.partners = [];
    }
    if (!Array.isArray(this.participants)) {
      this.participants = [];
    }
    if (!Array.isArray(this.likes)) {
      this.likes = [];
    }
    if (!Array.isArray(this.dislikes)) {
      this.dislikes = [];
    }
    if (!Array.isArray(this.favorites)) {
      this.favorites = [];
    }
  
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
// Ajout d'index pour optimiser les requêtes
eventSchema.index({ created_by: 1 });
eventSchema.index({ start_date: 1 });
eventSchema.index({ isApproved: 1 });
eventSchema.index({ participants: 1 });
eventSchema.index({ partners: 1 });

module.exports = mongoose.model('Event', eventSchema);