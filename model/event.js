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
    date: {
        type: Date,
        required: true
    },
    localisation: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 200
    },
    lieu: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 200
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
    imageUrl: { // Nouveau champ pour l'image
        type: String,
        trim: true,
        default: null // Optionnel, null si pas d'image
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', eventSchema);