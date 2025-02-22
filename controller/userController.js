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

// Token de validation pour l'activation du compte (valide 24h) ghassen
const createValidationToken = (id) => {
    return jwt.sign({ id }, 'validation_secret', { expiresIn: '1d' });
};

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

        // Vérifier si l'email et le mot de passe sont fournis
        if (!email || !password) {
            return res.status(400).json({ message: "Veuillez entrer votre email et votre mot de passe." });
        }

        // Trouver l'utilisateur par email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Email incorrect." });
        }

        // Vérifier le mot de passe haché avec bcrypt
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Mot de passe incorrect." });
        }

        // Vérifier si l'utilisateur est activé
        if (user.etat === "Désactivé") {
            return res.status(403).json({ message: "Votre compte est désactivé. Veuillez contacter l'administrateur." });
        }

        // Générer le token JWT
        const token = createtoken(user._id, user.username);

        // Définir le cookie avec le token (optionnel)
        res.cookie('jwt-token', token, { httpOnly: true, maxAge: maxAge * 1000 });

        // Retourner les informations utilisateur
        res.status(200).json({
            message: "Connexion réussie !",
            user,
            token
        });

    } catch (err) {
        console.error("❌ Erreur dans login :", err);
        res.status(500).json({ message: "Erreur interne du serveur." });
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


//ghassen
// ✅ Ajouter un utilisateur avec validation par email
module.exports.createUser = async (req, res) => {
    try {
        console.log("📩 Données reçues du frontend :", req.body);

        const { username, email, dob, role, speciality, level } = req.body;

        if (!['psychiatrist', 'teacher', 'association_member', 'student'].includes(role)) {
            return res.status(400).json({ message: "Rôle invalide" });
        }

        // 🔹 Mot de passe par défaut
        const defaultPassword = "Aa123456&";

        // 🔹 Création de l'utilisateur
        const newUser = new User({
            username,
            email,
            password: defaultPassword,
            dob,
            role,
            isVerified: false
        });

        await newUser.save();
        console.log("✔️ Utilisateur sauvegardé avec succès :", newUser);

        // 🔹 Contenu de l'e-mail
        const subject = "Bienvenue ! Voici vos informations de connexion";
        const loginUrl = "http://localhost:3000/login"; // URL de connexion

        const htmlContent = `
            <h2>Bienvenue, ${username} !</h2>
            <p>Votre compte a été créé avec succès.</p>
            <p><strong>🔹 Identifiants de connexion :</strong></p>
            <ul>
                <li><strong>Email :</strong> ${email}</li>
                <li><strong>Mot de passe :</strong> ${defaultPassword}</li>
                <li><strong>Rôle :</strong> ${role}</li>
            </ul>
            <p>Vous pouvez vous connecter en cliquant sur le lien ci-dessous :</p>
            <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
                Se connecter
            </a>
            <p>Nous vous recommandons de modifier votre mot de passe après votre première connexion.</p>
        `;

        // 🔹 Envoi de l'email
        await sendEmail(email, subject, htmlContent);

        res.status(201).json({ message: "Utilisateur créé avec succès ! Un e-mail contenant les identifiants a été envoyé." });

    } catch (err) {
        console.error("❌ Erreur lors de la création de l'utilisateur :", err);
        res.status(500).json({ message: err.message });
    }
};


// ✅ Vérifier l'utilisateur après clic sur le lien d'activation
module.exports.verifyUser = async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, "validation_secret");

        // ✅ Trouver l'utilisateur via l'email stocké dans le token
        const user = await User.findOne({ email: decoded.id });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: "Compte déjà activé." });
        }

        // ✅ Activer le compte
        user.isVerified = true;
        user.validationToken = null;
        await user.save();

        // ✅ Redirection vers la connexion
        res.redirect("http://localhost:3000/login");

    } catch (err) {
        res.status(400).json({ message: "Lien de validation invalide ou expiré." });
    }
};

// Récupérer un utilisateur par ID
module.exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// Mettre à jour un utilisateur
module.exports.updateUser = async (req, res) => {
    try {
        const { username, email, dob, role, speciality, level } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { username, email, dob, role, speciality, level },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ message: "Utilisateur non trouvé" });

        res.status(200).json({ message: "Utilisateur mis à jour", user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// Supprimer un utilisateur
module.exports.deleteUser = async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: "Utilisateur non trouvé" });
        res.status(200).json({ message: "Utilisateur supprimé avec succès" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

  // ✅ Supprimer tous les utilisateurs
  module.exports.deleteAllUsers = async (req, res) => {
    try {
        // Supprimer tous les utilisateurs
        const result = await User.deleteMany({});
        
        res.status(200).json({ message: `${result.deletedCount} utilisateurs supprimés avec succès.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//Recherche User
module.exports.searchUsers = async (req, res) => {
    try {
        console.log("🔍 Requête reçue avec filtres :", req.query);

        const { username, email, role, speciality, level, sortBy, order, page, limit } = req.query;
        let filter = {};

        if (username) {
            filter.username = { $regex: username, $options: "i" };
        }
        if (email) {
            filter.email = { $regex: email, $options: "i" };
        }
        if (role) {
            filter.role = role; // Vérification si `role` est bien une chaîne de caractères
        }
        if (speciality && role === "student") {
            filter.speciality = speciality;
        }
        if (level && role === "student") {
            filter.level = parseInt(level);
        }

        let sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = order === "desc" ? -1 : 1;
        }

        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;

        console.log("🛠️ Filtre appliqué :", filter);

        const users = await User.find(filter).sort(sortOptions).skip(skip).limit(pageSize);
        const totalUsers = await User.countDocuments(filter);

        res.status(200).json({
            totalUsers,
            currentPage: pageNumber,
            totalPages: Math.ceil(totalUsers / pageSize),
            users,
        });
    } catch (err) {
        console.error("❌ ERREUR DANS searchUsers :", err);  // Affiche l'erreur exacte
        res.status(500).json({ message: err.message });
    }
};
