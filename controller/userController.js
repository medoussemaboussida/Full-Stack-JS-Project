const User = require('../model/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const sendEmail = require('../utils/emailSender');
const multer = require('multer');
const path = require('path');

dotenv.config(); // Charger les variables d'environnement

//jwt config
const maxAge=1 * 60 * 60 ; //1hrs
const createtoken=(id)=>{
return jwt.sign({id},'randa',{expiresIn:maxAge})
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
            updatedAt: user.updatedAt, // Si vous souhaitez également la date de mise à jour
            availability: user.availability // Ajoutez ceci
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
  




// Configuration de multer pour stocker les fichiers
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Dossier où les photos seront stockées
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Nom unique pour chaque fichier
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images only (jpeg, jpg, png)!');
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
}).single('user_photo');

// Mise à jour du profil étudiant
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
            if (username) user.username = username;
            if (email) user.email = email;
            if (dob) user.dob = dob;
            if (speciality) user.speciality = speciality;
            if (level) user.level = level;
            if (password) {
                user.password = password; // Note : Hachez le mot de passe dans une vraie application
            }
        } else {
            if (password) {
                user.password = password;
            } else {
                return res.status(403).json({ message: "Action non autorisée pour ce rôle" });
            }
        }

        const updatedUser = await user.save();
        res.status(200).json({
            message: "Profil mis à jour avec succès",
            user: updatedUser.toObject()
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Mise à jour de la photo de profil
module.exports.updateStudentPhoto = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err });
        }

        try {
            const userId = req.params.id;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ message: "Utilisateur non trouvé" });
            }

            if (req.file) {
                user.user_photo = `/uploads/${req.file.filename}`; // Chemin relatif de la photo
            } else {
                return res.status(400).json({ message: "Aucune photo téléchargée" });
            }

            const updatedUser = await user.save();
            res.status(200).json({
                message: "Photo de profil mise à jour avec succès",
                user: updatedUser.toObject()
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });
};

// Afficher un seul étudiant
module.exports.getStudentById = async (req, res) => {
    try {
        const studentId = req.params.id;

        // Recherche de l'étudiant par ID et vérification du rôle
        const student = await User.findOne({ _id: studentId });

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
            return res.status(400).json({ message: "User not found" });
        }

        console.log("Secret Key utilisée pour le token:", process.env.JWT_SECRET); // Vérifie la clé utilisée

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
        console.log("Generated Token:", token); // Vérifie le token généré

        const resetLink = `http://localhost:3000/reset-password/${token}`;
        console.log("Lien de réinitialisation:", resetLink); // Vérifie si le lien est bien formé

        // Formatage de l'email avec du contenu HTML
        const emailContent = `
            <h3>Password reset</h3>
            <p>You requested to reset your password. Click the link below to proceed :</p>
            <a href="${resetLink}" target="_blank">Password reset</a>
            <p>This link will expire in one hour.</p>
        `;

        // Assure-toi que la fonction sendEmail accepte du HTML
        await sendEmail(user.email, "Password reset", emailContent);

        res.json({ message: "Email sent !" });
    } catch (error) {
        console.error("Erreur dans forgotPassword:", error.message);
        res.status(500).json({ message: "Internal server error" });
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
            return res.status(400).json({ message: "User not found" });
        }

        // Vérifie si le mot de passe est bien dans le corps de la requête
        if (!req.body.password) {
            return res.status(400).json({ message: "The password is required" });
        }

        // Enregistre le mot de passe en clair (sans hachage)
        user.password = req.body.password; // Pas de hash ici

        await user.save();

        res.json({ message: "Password reset successfully" });
    } catch (error) {
        console.error("Erreur lors de la réinitialisation:", error.message);
        res.status(400).json({ message: "Invalid or expired token" });
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
//Liste favories
exports.toggleFavoriteActivity = async (req, res) => {
    console.log("✅ Requête reçue sur /favorite-activity/:id avec ID :", req.params.id);

    try {
        const { id } = req.params; // Assure-toi que c'est bien `id` et pas `userId`
        const { activity } = req.body;

        if (!activity) {
            return res.status(400).json({ message: "Activité non spécifiée" });
        }

        const user = await User.findById(id); // Vérifie l'ID ici
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Ajouter ou supprimer des favoris
        const isFavorite = user.favoriteActivities.includes(activity);
        if (isFavorite) {
            user.favoriteActivities = user.favoriteActivities.filter(a => a !== activity);
        } else {
            user.favoriteActivities.push(activity);
        }

        await user.save();
        res.json({ message: "Activité mise à jour", favoriteActivities: user.favoriteActivities });
    } catch (error) {
        console.error("❌ Erreur toggleFavoriteActivity:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};


function generatePassword(length = 12) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters.charAt(randomIndex);
    }
    return password;
}


// ✅ Ajouter un utilisateur avec validation par email
module.exports.createUser = async (req, res) => {
    try {
        console.log("📩 Données reçues du frontend :", req.body);

        const { username, email, dob, role } = req.body;

        if (!['psychiatrist', 'teacher', 'association_member'].includes(role)) {
            return res.status(400).json({ message: "Rôle invalide" });
        }

        // 🔹 Génération du mot de passe automatique
        const generatedPassword = generatePassword(12);  // Tu peux ajuster la longueur du mot de passe ici

        // 🔹 Création de l'utilisateur
        const newUser = new User({
            username,
            email,
            password: generatedPassword, // Utilisation du mot de passe généré
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
                <li><strong>Mot de passe :</strong> ${generatedPassword}</li> <!-- Affichage du mot de passe généré -->
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

        // Combine username and email search into an OR condition
        if (username || email) {
            filter.$or = [];
            if (username) filter.$or.push({ username: { $regex: username, $options: "i" } });
            if (email) filter.$or.push({ email: { $regex: email, $options: "i" } });
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


// Récupérer les psychiatres avec leurs disponibilités
module.exports.getPsychiatrists = async (req, res) => {
    try {
        const psychiatrists = await User.find({ role: 'psychiatrist' });
        res.status(200).json(psychiatrists);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};






// Ajouter une disponibilité pour un psychiatre
module.exports.addAvailability = async (req, res) => {
    const { day, startTime, endTime } = req.body;
    const userId = req.params.id;

    try {
        // Vérifier que l'utilisateur existe et est un psychiatre
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'psychiatrist') {
            return res.status(403).json({ message: 'This action is only allowed for psychiatrists' });
        }

        // Vérifier que tous les champs nécessaires sont fournis
        if (!day || !startTime || !endTime) {
            return res.status(400).json({ message: 'Day, start time, and end time are required' });
        }

        // Ajouter la nouvelle disponibilité au tableau availability
        user.availability.push({ day, startTime, endTime });
        const updatedUser = await user.save();

        res.status(200).json({ message: 'Availability added successfully', user: updatedUser });
    } catch (error) {
        console.error('Error adding availability:', error);
        res.status(500).json({ message: 'Server error' });
    }
};



module.exports.deleteAvailability = async (req, res) => {
    const userId = req.params.id;
    const index = req.params.index;
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "psychiatrist") return res.status(403).json({ message: "Action restricted to psychiatrists" });
      if (index < 0 || index >= user.availability.length) return res.status(400).json({ message: "Invalid index" });
  
      user.availability.splice(index, 1); // Supprime l'élément à l'index spécifié
      const updatedUser = await user.save();
      res.status(200).json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  };

  module.exports.updateAvailability = async (req, res) => {
    const { day, startTime, endTime } = req.body;
    const userId = req.params.id;
    const index = req.params.index;
  
    try {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role !== "psychiatrist") return res.status(403).json({ message: "Action restricted to psychiatrists" });
      if (index < 0 || index >= user.availability.length) return res.status(400).json({ message: "Invalid index" });
  
      user.availability[index] = { day, startTime, endTime };
      const updatedUser = await user.save();
      res.status(200).json({ user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  };