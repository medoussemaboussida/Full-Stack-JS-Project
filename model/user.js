const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username :{ type: String , required : true},
    dob: { 
        type: Date, 
        required: true, 
        validate: {
            validator: function (value) {
                const today = new Date();
                const birthDate = new Date(value);

                // Vérifier que la date n'est pas dans le futur
                if (birthDate > today) {
                    return false;
                }

                // Calculer l'âge
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                const dayDiff = today.getDate() - birthDate.getDate();

                if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                    age--; // Ajuster si l'anniversaire n'est pas encore passé
                }

                return age >= 18;
            },
            message: "La date de naissance doit être valide et l'utilisateur doit avoir au moins 18 ans."
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (value) {
                return /^[a-zA-Z0-9._%+-]+@esprit\.tn$/.test(value);
            },
            message: "Email must end with @esprit.tn"
        }
    },   
    password: { 
        type: String,
        required: function() {
            // Only required for 'student' role and if Google login didn't provide a password
            return this.role === 'student' && !this.password;
        },
        default: function() {
            // Set a default password if it's a 'student' and not provided
            if (this.role === 'student' && !this.password) {
                return 'defaultPassword123';
            }
            return undefined;
        }
    },
    role: { type: String , enum:[ 'student', 'psychiatrist','teacher','association_member'] , required : false},
    user_photo: {type : String , required: false},
    etat: {type : String ,  default: function () {return this.role === 'student' ? 'Actif' : 'Désactivé';}},
    speciality: { 
        type: String, 
        enum: ['A', 'B', 'P', 'TWIN', 'SAE', 'SE', 'BI', 'DS', 'IOSYS', 'SLEAM', 'SIM', 'NIDS', 'INFINI','choose your speciality'], 
        required: function() { return this.role === 'student'; },
        validate: {
            validator: function(value) {
                if (this.role === 'student') {
                    return value !== null && value !== undefined;
                }
                return true;
            },
            message: "La spécialité est obligatoire pour les étudiants."
        }
    },
    level: { type: Number, required: function() { return this.role === 'student'; } },
    validationToken: { type: String, required: false },

    favoriteActivities: [{ type: String ,required: false}], // Liste des activités favorites
    pinnedActivities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }],
    availability: [{
        date: { type: Date, required: true }, // Full date (e.g., "2025-04-04")
        startTime: { type: String, required: true }, // e.g., "10:00"
        endTime: { type: String, required: true }, // e.g., "10:30"
      }],

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Publication' }],

    pinnedPublications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Publication', // Référence au modèle Publication
    }],
    receiveEmails: { type: Boolean, default: true },
    
    attendanceSheets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AttendanceSheet'
    }],
    isBanned: { type: Boolean, default: false },
    banExpiration: { type: Date, default: null },
    banReason: { type: String, default: "" },

// Nouveau champ pour les événements auxquels l'étudiant participe
participatedEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event', // Assurez-vous que 'Event' correspond au nom de votre modèle d'événements
}],
}, { timestamps: true });




// ✅ Middleware pour hacher le mot de passe avant de sauvegarder
userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});


// ✅ Middleware post-save pour confirmation
userSchema.post("save", function () {
    console.log(`✅ Utilisateur ${this.username} créé avec succès.`);
});


const User = mongoose.model("User", userSchema);
module.exports = User;
