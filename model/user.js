const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username :{ type: String , required : true},
    dob: { type: Date, required: true },
    email :{ type: String , required : true , unique : true},
<<<<<<< HEAD
    password: { type: String , required : true},
    role: { type: String , enum:[ 'student', 'psychiatrist','teacher','association_member'] , required : false},
    user_photo: {type : String , required: false},
    etat: {type : String , default:'Actif',required: false},
    speciality: { type: String , enum:[ 'A', 'B','P','TWIN','SAE','SE','BI','DS','IOSYS','SLEAM','SIM','NIDS','INFINI'] , required : true},
    level: { type: Number, required: true },
=======
    password: { type: String , required: function() { return this.role === 'student'; }},
    role: { type: String , enum:[ 'student', 'psychiatrist','teacher','association_member'] , required : false},
    user_photo: {type : String , required: false},
    etat: {type : String ,  default: function () {return this.role === 'student' ? 'Actif' : 'Désactivé';}},
    speciality: { 
        type: String, 
        enum: ['A', 'B', 'P', 'TWIN', 'SAE', 'SE', 'BI', 'DS', 'IOSYS', 'SLEAM', 'SIM', 'NIDS', 'INFINI'], 
        required: function() { return this.role === 'student'; },
        validate: {validator: function(value) {
                if (this.role === 'student') 
                    { return value !== null && value !== undefined;}
                return true;
            },
            message: "La spécialité est obligatoire pour les étudiants."
        }
    },
    level: { type: Number, required: function() { return this.role === 'student'; } },
>>>>>>> 25ac108 (Crud User + Forgot Password)
    validationToken: { type: String, required: false },

   
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
