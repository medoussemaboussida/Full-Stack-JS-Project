const mongoose = require("mongoose");

const forumBanSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence au modèle User
      required: true,
    },
    duration: {
      type: Number, // Durée du bannissement en jours
      required: true,
      min: 1, // Durée minimale de 1 jour
    },
    reason: {
      type: String,
      enum: [
        "inappropriate_content",
        "spam",
        "harassment",
        "offensive_language",
        "misinformation",
        "other",
      ],
      required: true,
    },
    bannedAt: {
      type: Date,
      default: Date.now, // Date de début du bannissement
    },
    expiresAt: {
      type: Date, // Date d'expiration du bannissement
      required: false,
    },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  }
);

// Middleware pour calculer expiresAt avant de sauvegarder
forumBanSchema.pre("save", function (next) {
    // S'assurer que bannedAt est défini
    if (!this.bannedAt) {
      this.bannedAt = new Date();
    }
  
    // Calculer expiresAt à partir de duration
    if (this.duration) {
      this.expiresAt = new Date(
        this.bannedAt.getTime() + this.duration * 24 * 60 * 60 * 1000
      );
    } else {
      // Si duration n'est pas défini, lever une erreur
      return next(new Error("Duration is required to calculate expiresAt"));
    }
  
    next();
  });

// Création du modèle ForumBan
const ForumBan = mongoose.model("ForumBan", forumBanSchema);

module.exports = ForumBan;