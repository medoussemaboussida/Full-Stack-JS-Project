const mongoose = require("mongoose");

const complaintResponseSchema = new mongoose.Schema(
    {
        content: { type: String, required: true },
        complaint_id: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", required: true },
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
    },
    {
        timestamps: true // Ajoute createdAt et updatedAt automatiquement
    }
);

const ComplaintResponse = mongoose.model("ComplaintResponse", complaintResponseSchema);

module.exports = ComplaintResponse;
