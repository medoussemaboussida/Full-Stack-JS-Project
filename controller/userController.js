const User = require('../model/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const sendEmail = require('../utils/emailSender');

dotenv.config(); // Charger les variables d'environnement

//jwt config
const maxAge=1 * 60 * 60 ; //1hrs
const createtoken=(id,role)=>{
return jwt.sign({id,role},'randa',{expiresIn:maxAge})
}

// Token de validation pour l'activation du compte (valide 24h) ghassen
const createValidationToken = (id,role) => {
    return jwt.sign({ id,role }, 'validation_secret', { expiresIn: '1d' });
};

//signup
module.exports.addStudent = async (req,res) => { 

    try{
        console.log(req.body);
        const{ username , dob , email, password,speciality,level}=req.body;
        const etatUser = "Actif"
        const photoUser= "Null"
        const roleUser = "student";
        const user = new User({username , email , dob , password , role:roleUser , etat:etatUser , user_photo:photoUser,speciality,level});
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
             // Vérifier le mot de passe crypté
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Mot de passe incorrect" });
        }
        else {
                // Générer le token
                const token = createtoken(user._id,user.role);

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

//logout
module.exports.logout = (req, res) => {
    try {
      // Supprimer les cookies associés au JWT
      res.clearCookie("this_is_jstoken", { httpOnly: true });
  
      // Si vous utilisez express-session pour gérer les sessions
      res.clearCookie("connect.sid");
  
      // Supprimer l'utilisateur de la session
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to destroy session" });
        }
        
        // Envoyer une réponse de déconnexion réussie
        res.status(200).json({ message: "Logged out successfully" });
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  




module.exports.updateStudentProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, email, dob, password, speciality, level } = req.body;

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Mise à jour des champs en fonction du rôle
        if (user.role === "student") {
            // Pour les étudiants, permettre la mise à jour de tous les champs
            if (username) user.username = username;
            if (email) user.email = email;
            if (dob) user.dob = dob;
            if (speciality) user.speciality = speciality;
            if (level) user.level = level;
            if (password) {
                user.password = password;  // Pas de hashage, stockage en clair
            }
        } else {
            // Pour les autres rôles, permettre uniquement la mise à jour du mot de passe
            if (password) {
                user.password = password;  // Pas de hashage, stockage en clair
            } else {
                return res.status(403).json({ message: "Action non autorisée pour ce rôle" });
            }
        }

        // Sauvegarder les modifications
        const updatedUser = await user.save();

        // Renvoyer les données mises à jour
        res.status(200).json({
            message: "Profil mis à jour avec succès",
            user: updatedUser.toObject(), // ou updatedUser.toJSON()
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
        const userId = req.params.id;

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Supprimer l'utilisateur
        await User.findByIdAndDelete(userId);

        res.status(200).json({ message: "Utilisateur supprimé avec succès" });
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






module.exports.updateEtat = async (req, res) => {
    try {
        const { etat } = req.body;
        const userId = req.params.id;

        console.log(`ID utilisateur: ${userId}, Nouvel état: ${etat}`); // Debug

        if (!["Actif", "Désactivé"].includes(etat)) {
            return res.status(400).json({ message: "État invalide. Valeurs autorisées : 'Actif', 'Désactivé'." });
        }

        // Mise à jour avec updateOne
        const result = await User.updateOne(
            { _id: userId },
            { $set: { etat } }
        );

        console.log(`Résultat mise à jour: ${JSON.stringify(result)}`); // Log après mise à jour

        // Si aucun utilisateur n'a été trouvé avec cet ID
        if (result.nModified === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé ou état déjà identique." });
        }

        // Récupérer l'utilisateur mis à jour
        const updatedUser = await User.findById(userId);

        console.log(`Utilisateur mis à jour: ${JSON.stringify(updatedUser)}`); // Log utilisateur mis à jour

        // Retourner la réponse
        res.status(200).json({
            message: "État mis à jour avec succès",
            user: updatedUser,
        });
    } catch (error) {
        console.error("❌ Erreur serveur :", error);
        res.status(500).json({ message: "Erreur serveur", error });
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
        const user = await User.findByIdAndUpdate(req.params.id, { etat: "Actif" }, { new: true });
    
        if (!user) {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
    
        res.json({ message: "Compte activé avec succès", user });
      } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
      }
    };

// Désactiver le compte
module.exports.deactivateAccount = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { etat: "Désactivé" }, { new: true });
    
        if (!user) {
          return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
    
        res.json({ message: "Compte désactivé avec succès", user });
      } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
      }
    };


//ghassen
// ✅ Ajouter un utilisateur avec validation par email
module.exports.createUser = async (req, res) => {
    try {
        console.log("📩 Données reçues du frontend :", req.body);

        const { username, email, dob, role } = req.body;

        if (!['psychiatrist', 'teacher', 'association_member'].includes(role)) {
            return res.status(400).json({ message: "Rôle invalide" });
        }

        // 🔹 Mot de passe par défaut
        const defaultPassword = "Aa123456&.";
    //    const hashedPassword = await bcrypt.hash(defaultPassword, 10);


        // 🔹 Création de l'utilisateur
        const newUser = new User({
            username,
            email,
            password: defaultPassword,
            dob,
            role,
            etat: "Désactivé", // 🔴 Désactivé par défaut
            validationToken: createValidationToken(email) // Générer un token pour l'activation
        });

        await newUser.save();
        console.log("✔️ Utilisateur sauvegardé avec succès :", newUser);

       // 🔹 Contenu de l'e-mail avec lien d'activation
       const activationLink = `http://localhost:5000/users/activate/${newUser.validationToken}`;
       const subject = "🔐 Activez votre compte EspritCare";
       const htmlContent = `
           <h2>Bienvenue, ${username} !</h2>
           <p>Votre compte a été créé, mais il est désactivé.</p>
           <p>Veuillez cliquer sur le bouton ci-dessous pour activer votre compte :</p>
           <a href="${activationLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
               Activer mon compte
           </a>
           <p>Une fois activé, utilisez ces informations pour vous connecter :</p>
           <ul>
               <li><strong>Email :</strong> ${email}</li>
               <li><strong>Mot de passe :</strong> ${defaultPassword}</li>
               <li><strong>Rôle :</strong> ${role}</li>
           </ul>
           <p>EspritCare</p>
       `;


        // 🔹 Envoi de l'email
        await sendEmail(email, subject, htmlContent);

        res.status(201).json({ message: "Utilisateur créé avec succès ! Un e-mail contenant les identifiants a été envoyé." });

    } catch (err) {
        console.error("❌ Erreur lors de la création de l'utilisateur :", err);
        res.status(500).json({ message: err.message });
    }
};
// ✅ Activer un utilisateur après clic sur le lien
module.exports.activateUser = async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, "validation_secret");

        // ✅ Trouver l'utilisateur via le token
        const user = await User.findOne({ validationToken: token });

        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        if (user.etat === "Actif") {
            return res.status(400).json({ message: "Compte déjà activé." });
        }

        // ✅ Activer le compte
        user.etat = "Actif";
        user.validationToken = null; // Supprimer le token après activation
        await user.save();

        // ✅ Redirection vers la connexion
        res.redirect("http://localhost:3000/login");

    } catch (err) {
        res.status(400).json({ message: "Lien de validation invalide ou expiré." });
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

        if (user.etat) {
            return res.status(400).json({ message: "Compte déjà activé." });
        }

        // ✅ Activer le compte
        user.etat = true;
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
