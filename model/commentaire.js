const mongoose = require('mongoose');

const commentaireSchema = new mongoose.Schema({
    contenu: {
        type: String,
        required: true,
        trim: true,
    },
    publication_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Publication', // Référence au modèle Publication
        required: true,
    },
    auteur_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Référence au modèle User (l'étudiant ou utilisateur qui commente)
        required: true,
    },
    dateCreation: {
        type: Date,
        default: Date.now,
    },
    isAnonymous: { type: Boolean, default: false }, // Nouveau champ
});

const Commentaire = mongoose.model('Commentaire', commentaireSchema);

module.exports = Commentaire;