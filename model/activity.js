const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: {
        type: String,
        enum: [
            "Professional and Intellectual",
            "Wellness and Relaxation",
            "Social and Relationship",
            "Physical and Sports",
            "Leisure and Cultural",
            "Consumption and Shopping",
            "Domestic and Organizational",
            "Nature and Animal-Related"
        ],
        required: true
    },
    imageUrl: { type: String, default: "default-activity.png" }, // Lien de l'image (par défaut)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Activity", activitySchema);
