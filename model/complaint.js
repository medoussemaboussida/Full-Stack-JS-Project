const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
    subject: { type: String, required: true },  
    description: { type: String, required: true },  
    status: { 
        type: String, 
        enum: ["pending", "resolved", "rejected"],  
        default: "pending"  // Default status is "pending"
    },
    user_id: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",  
        required: true
    }
}, 
{
    timestamps: true  // Automatically adds createdAt and updatedAt fields
});

const Complaint = mongoose.model("Complaint", complaintSchema);

module.exports = Complaint;
