const mongoose = require("mongoose");

const associationSchema = new mongoose.Schema(
    {
        Name_association: {
            type: String,
            required: true,
            trim: true,
            minlength: 6,
            maxlength: 30,
            validate: {
                validator: function (value) {
                    return /^[a-zA-Z0-9\s]+$/.test(value);
                },
                message: "Name can only contain letters, numbers, and spaces.",
            },
        },
        Description_association: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 1000,
        },
        contact_email_association: {
            type: String,
            required: true,
            unique: true,
            validate: {
                validator: function (value) {
                    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
                },
                message: "Please provide a valid email address.",
            },
        },
        logo_association: {
            type: String,
            required: false,  // Logo n'est pas obligatoire
            trim: true,
        },
        support_type: {
            type: String,
            required: true,
            enum: ["Financial", "Material", "Educational", "Other"],
            default: "Other",
        },
        user_id: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User", 
            required: false 
        },
    },
    { timestamps: true }
);

// Middleware pour journaliser les actions principales
associationSchema.post(["save", "findOneAndUpdate", "findOneAndDelete"], function (doc) {
    if (doc) {
        const action = this.operation === 'delete' ? 'deleted' : this.operation === 'update' ? 'updated' : 'created';
        console.log(`✅ Association "${doc.Name_association}" ${action} successfully.`);
    }
});

const Association = mongoose.model("Association", associationSchema);
module.exports = Association;
