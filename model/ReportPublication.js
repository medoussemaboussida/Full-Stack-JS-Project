const mongoose = require("mongoose");

const reportPublicationSchema = new mongoose.Schema({
    publicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Publication",
        required: [true, "L'ID de la publication est requis"],
        index: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "L'ID de l'utilisateur est requis"],
        index: true,
    },
    reason: {
        type: String,
        required: [true, "La raison du signalement est requise"],
        enum: {
            values: [
                "inappropriate_content",
                "spam",
                "harassment",
                "offensive_language",
                "misinformation",
                "other",
            ],
            message: "La raison doit être une des valeurs prédéfinies : {VALUE} n'est pas valide",
        },
    },
    customReason: {
        type: String,
        trim: true,
        maxlength: [500, "La raison personnalisée ne peut pas dépasser 500 caractères"],
        default: null,
    },
    dateReported: {
        type: Date,
        default: Date.now,
        immutable: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Index composé pour empêcher les signalements multiples par le même utilisateur pour la même publication
reportPublicationSchema.index({ publicationId: 1, userId: 1 }, { unique: true });

const ReportPublication = mongoose.model("ReportPublication", reportPublicationSchema);

module.exports = ReportPublication;