const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  Name_event: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 50,
  },
  Description_event: {
    type: String,
    required: true,
    minlength: 10,
    maxlength: 1000,
  },
  contact_email_event: {
    type: String,
    required: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  support_type_event: {
    type: String,
    enum: [
      'PsychologicalCounseling', // Conseil psychologique
      'SupportGroup',           // Groupe de soutien
      'TherapeuticWorkshop',    // Atelier thérapeutique
      'AwarenessCampaign',      // Campagne de sensibilisation
      'PeerSupport',            // Soutien par les pairs
      'CrisisIntervention',     // Intervention en cas de crise
      'WellnessActivity',       // Activité de bien-être
    ],
    required: true,
  },
  Localisation_event: { // Note : corrigé "Location_event" pour correspondre à votre modèle
    type: String,
    required: true,
  },
  Date_event: {
    type: Date,
    required: true,
  },
  Time_event: { // Nouveau champ pour l'heure
    type: String,
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // Format HH:MM (24h), ex. "14:30"
    validate: {
      validator: function (value) {
        const [hours, minutes] = value.split(':');
        return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
      },
      message: "L'heure doit être au format HH:MM valide (ex. 14:30)"
    }
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  associations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Association',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);