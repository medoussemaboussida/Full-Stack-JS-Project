const User = require('../model/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const sendEmail = require('../utils/emailSender');

dotenv.config(); // Charger les variables d'environnement

//jwt config
const maxAge=1 * 60 * 60 ; //1hrs
const createtoken=(id,username)=>{
return jwt.sign({id,username},'randa',{expiresIn:maxAge})
}

//signup
module.exports.addStudent = async (req,res) => { 

    try{
        console.log(req.body);
        const{ username , dob , email, password,speciality,level}=req.body;
        const etatUser = "Actif"
        const photoUser= "Null"
        const roleUser = "student";
        const user = new User({username , email , dob , password , role:roleUser , etat:etatUser , user_photo:photoUser,speciality:speciality,level:level});
        const userAdded = await user.save()
        res.status(201).json(userAdded);
    }catch(err){
        res.status(500).json({message: err.message})
    }
} 
//login
module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Trouver l'utilisateur par email
        const user = await User.findOne({ email });
        if (user) {
            // Comparer le mot de passe en clair
            if (password === user.password && user.role === "student") {
                // Générer le token
                const token = createtoken(user._id);

                // Définir le cookie avec le token
                res.cookie('jwt-token', token, { httpOnly: true, maxAge: maxAge * 1000 });

                // Retourner l'utilisateur et le token
                return res.status(200).json({ user, token });
            } 
            throw new Error("Incorrect password or unauthorized role");
        }
        throw new Error("Incorrect email");
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

module.exports.Session = async (req, res) => {
    try {
        const user = await User.findById(req.params.id); // Récupérer l'utilisateur par son ID
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Retourner toutes les informations de l'utilisateur
        res.json({
            username: user.username,
            dob: user.dob,
            email: user.email,
            role: user.role,
            user_photo: user.user_photo,
            etat: user.etat,
            speciality: user.speciality,
            level: user.level,
            createdAt: user.createdAt, // Si vous souhaitez également la date de création
            updatedAt: user.updatedAt  // Si vous souhaitez également la date de mise à jour
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};





module.exports.updateStudentProfile = async (req, res) => {
    try {
        const studentId = req.params.id;
        const { username, email, dob, password, speciality, level } = req.body;

        // Vérifier si l'utilisateur existe
        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Étudiant non trouvé" });
        }

        // Mise à jour des champs
        if (username) student.username = username;
        if (email) student.email = email;
        if (dob) student.dob = dob;
        if (speciality) student.speciality = speciality;
        if (level) student.level = level;

        if (password) {
            student.password = password;  // Pas de hashage, stockage en clair
        }

        // Sauvegarder les modifications
        const updatedStudent = await student.save();

        res.status(200).json({
            message: "Profil mis à jour avec succès",
            student: updatedStudent,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//afficher un seul etudiant
module.exports.getStudentById = async (req, res) => {
    try {
        const studentId = req.params.id;

        // Recherche de l'étudiant par ID et vérification du rôle
        const student = await User.findOne({ _id: studentId, role: "student" });

        if (!student) {
            return res.status(404).json({ message: "Étudiant non trouvé" });
        }

        res.status(200).json(student);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//supprimer student
module.exports.deleteStudentById = async (req, res) => {
    try {
        const studentId = req.params.id;

        // Vérifier si l'utilisateur est un étudiant avant suppression
        const student = await User.findOne({ _id: studentId, role: "student" });

        if (!student) {
            return res.status(404).json({ message: "Étudiant non trouvé" });
        }

        await User.findByIdAndDelete(studentId);

        res.status(200).json({ message: "Étudiant supprimé avec succès" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


const crypto = require("crypto");

module.exports.forgotPassword = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).json({ message: "Utilisateur non trouvé" });
        }

        console.log("Secret Key utilisée pour le token:", process.env.JWT_SECRET); // Vérifie la clé utilisée

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        console.log("Generated Token:", token); // Vérifie le token généré

        const resetLink = `http://localhost:3000/reset-password/${token}`;
        console.log("Lien de réinitialisation:", resetLink); // Vérifie si le lien est bien formé

        // Formatage de l'email avec du contenu HTML
        const emailContent = `
            <h3>Réinitialisation du mot de passe</h3>
            <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous pour le faire :</p>
            <a href="${resetLink}" target="_blank">Réinitialiser le mot de passe</a>
            <p>Ce lien expirera dans une heure.</p>
        `;

        // Assure-toi que la fonction sendEmail accepte du HTML
        await sendEmail(user.email, "Réinitialisation du mot de passe", emailContent);

        res.json({ message: "E-mail envoyé" });
    } catch (error) {
        console.error("Erreur dans forgotPassword:", error.message);
        res.status(500).json({ message: "Erreur interne du serveur" });
    }
};




module.exports.resetPassword = async (req, res) => {
    try {
        console.log("Données reçues :", req.body); // Affiche les données reçues pour déboguer

        const token = req.params.token;

        if (!token) {
            return res.status(400).json({ message: "Token manquant" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Token décodé:", decoded);

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(400).json({ message: "Utilisateur non trouvé" });
        }

        // Vérifie si le mot de passe est bien dans le corps de la requête
        if (!req.body.password) {
            return res.status(400).json({ message: "Le mot de passe est requis" });
        }

        // Enregistre le mot de passe en clair (sans hachage)
        user.password = req.body.password; // Pas de hash ici

        await user.save();

        res.json({ message: "Mot de passe réinitialisé avec succès" });
    } catch (error) {
        console.error("Erreur lors de la réinitialisation:", error.message);
        res.status(400).json({ message: "Token invalide ou expiré" });
    }
};









// Récupérer tous les utilisateurs
module.exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Activer le compte
module.exports.activateAccount = async (req, res) => {
    try {
        const userId = req.params.id;

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Vérifier si l'utilisateur est déjà actif
        if (user.etat === "Actif") {
            return res.status(400).json({ message: "Le compte est déjà actif" });
        }

        // Mettre à jour l'état du compte en "Actif"
        user.etat = "Actif";
        await user.save();

        res.status(200).json({ message: "Compte activé avec succès", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Désactiver le compte
module.exports.deactivateAccount = async (req, res) => {
    try {
        const userId = req.params.id;

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Vérifier si l'utilisateur est déjà désactivé
        if (user.etat === "Désactivé") {
            return res.status(400).json({ message: "Le compte est déjà désactivé" });
        }

        // Mettre à jour l'état du compte en "Désactivé"
        user.etat = "Désactivé";
        await user.save();

        res.status(200).json({ message: "Compte désactivé avec succès", user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
