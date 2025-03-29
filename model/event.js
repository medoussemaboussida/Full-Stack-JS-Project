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
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    localisation: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 200
    },
    lieu: {
        type: String,
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
    event_type: { // New field for event type
        type: String,
        required: true,
        enum: ['in-person', 'online'], // Restrict to these values
        default: 'in-person'
    },
    online_link: { // New field for online event link
        type: String,
        trim: true,
        match: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, // Basic URL validation
        required: function() {
            return this.event_type === 'online'; // Required only if event_type is 'online'
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
    }
});

module.exports = mongoose.model('Event', eventSchema);