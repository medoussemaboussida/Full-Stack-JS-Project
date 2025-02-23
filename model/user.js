const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        trim: true,
        validate: {
            validator: function(value) {
                return /^[A-Za-z\s]+$/.test(value);
            },
            message: "Le nom d'utilisateur ne peut contenir que des lettres et des espaces."
        }
    },
    dob: { type: Date, required: false },
    
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(value) {
                return /^[a-zA-Z0-9._%+-]+@esprit\.tn$/.test(value);
            },
            message: "L'email doit être au format valide et se terminer par @gmail.com."
        }
    },
    
    password: { 
        type: String, 
        required: false, // ✅ Mot de passe devient optionnel
        minlength: [6, "Le mot de passe doit contenir au moins 6 caractères."]
    },

    validationToken: { type: String, required: false },
    
    role: { 
        type: String, 
        enum: ['student', 'psychiatrist', 'teacher', 'association_member'], 
        required: true
    },

    user_photo: { type: String, required: false },

    speciality: { 
        type: String, 
        enum: ['A', 'B', 'P', 'TWIN', 'SAE', 'SE', 'BI', 'DS', 'IOSYS', 'SLEAM', 'SIM', 'NIDS', 'INFINI'], 
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

    level: { 
        type: Number, 
        required: function() { return this.role === 'student'; },
        min: [1, "Le niveau doit être au minimum 1."],
        max: [5, "Le niveau ne peut pas dépasser 5."]
    },
    etat: {
        type: String,
        enum: ['Actif', 'Désactivé'],
        default: function () {
            return this.role === 'student' ? 'Actif' : 'Désactivé';
        }
    }
    
   
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
