const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
    title: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
      },
      isArchived: {
        type: Boolean,
        default: false
    },
    imageUrl: { type: String},
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Activity", activitySchema);
