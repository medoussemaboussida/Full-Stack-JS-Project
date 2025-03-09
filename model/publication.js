const mongoose = require('mongoose');

const publicationSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'La description de la publication est obligatoire'],
        trim: true, // Supprime les espaces inutiles au début et à la fin
    },
    datePublication: {
        type: Date,
        required: [true, 'La date de publication est obligatoire'],
        default: Date.now, // Par défaut, la date actuelle
    },
    imagePublication: {
        type: String, // Chemin ou URL de l'image
        required: false, // Optionnel, car une publication peut ne pas avoir d'image
    },
    titrePublication: {
        type: String,
        required: [true, 'Le titre de la publication est obligatoire'],
        trim: true,
        minlength: [3, 'Le titre doit contenir au moins 3 caractères'],
        maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères'],
    },
    author_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Référence au modèle User
        required: [true, 'L\'auteur de la publication est obligatoire'],
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'], // Statuts possibles
        default: 'draft', // Par défaut, brouillon
        required: [true, 'Le statut de la publication est obligatoire'],
    },
    tag: {
        type: [String], // Tableau de tags (chaînes de caractères)
        required: false, // Optionnel
        validate: {
            validator: function (value) {
                return value.every(tag => typeof tag === 'string' && tag.length > 0);
            },
            message: 'Chaque tag doit être une chaîne non vide',
        },
    },
    // Ajout des champs pour Likes et Dislikes
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Référence aux utilisateurs qui ont aimé
    }],
    dislikes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Référence aux utilisateurs qui n'ont pas aimé
    }],
    likeCount: {
        type: Number,
        default: 0, // Compteur de Likes
    },
    dislikeCount: {
        type: Number,
        default: 0, // Compteur de Dislikes
    },
    
    // Nouveau champ pour suivre le nombre de commentaires (optionnel)
    nombreCommentaires: { type: Number, default: 0 },
    // Ou une référence aux commentaires (optionnel, si vous voulez les intégrer directement)
    commentaires: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commentaire' }],
}, {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
});

// Middleware pour loguer la création d'une publication
publicationSchema.post('save', function () {
    console.log(`✅ Publication "${this.titrePublication}" créée avec succès par l'utilisateur ${this.author_id}.`);
});

const Publication = mongoose.model('Publication', publicationSchema);

module.exports = Publication;