const User = require('../model/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const sendEmail = require('../utils/emailSender');
const multer = require('multer');
const path = require('path');
const Publication = require('../model/publication'); // Assurez-vous que le chemin est correct
const Appointment = require("../model/appointment");
const Chat = require("../model/chat");
const { v4: uuidv4 } = require('uuid');


const Commentaire = require('../model/commentaire'); // Importer le modèle Commentaire

dotenv.config();

// JWT config
const maxAge = 1 * 60 * 60; // 1 heure
const createtoken = (id, role) => {
    return jwt.sign({ id, role }, 'randa', { expiresIn: maxAge });
};

// Middleware pour vérifier le token JWT
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log('Authorization Header:', authHeader);
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Token extrait:', token);

    if (!token) {
        return res.status(401).json({ message: 'Aucun token fourni, authentification requise' });
    }

    jwt.verify(token, 'randa', (err, decoded) => {
        if (err) {
            console.log('Erreur JWT:', err.message);
            return res.status(403).json({ message: 'Token invalide ou expiré', error: err.message });
        }
        console.log('Token décodé:', decoded);
        req.userId = decoded.id;
        next();
    });
};

// Configuration de multer pour les publications
const storage1 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/publications/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload1 = multer({
    storage: storage1,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb('Erreur : Seules les images (jpeg, jpg, png) sont acceptées !');
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('imagePublication');

// Signup
module.exports.addStudent = async (req, res) => {
    try {
        console.log(req.body);
        const { username, dob, email, password, speciality, level } = req.body;
        const etatUser = "Actif";
        const photoUser = "Null";
        const roleUser = "student";
        const user = new User({ username, email, dob, password, role: roleUser, etat: etatUser, user_photo: photoUser, speciality, level });
        const userAdded = await user.save();
        res.status(201).json(userAdded);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Login
module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Email incorrect" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Password or Email incorrect" });
        }

        const token = createtoken(user._id, user.role);
        res.status(200).json({ user, token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Session
module.exports.Session = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
        res.json({
            username: user.username,
            dob: user.dob,
            email: user.email,
            role: user.role,
            user_photo: user.user_photo,
            etat: user.etat,
            speciality: user.speciality,
            level: user.level,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            availability: user.availability
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur serveur', error });
    }
};

module.exports.getStudentBytoken = async (req, res) => {
    try {
        const token = req.params.token;

        console.log("Token reçu :", token);

        if (!token) {
            return res.status(400).json({ message: "Token manquant" });
        }

        // Vérifie que le token correspond bien à un utilisateur
        const student = await User.findOne({ validationToken: token, role: "student" });

        if (!student) {
            return res.status(404).json({ message: "Étudiant non trouvé" });
        }

        res.status(200).json(student);
    } catch (err) {
        console.error("Erreur :", err);
        res.status(500).json({ message: err.message });
    }
};

// Logout
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

  // Configuration de multer pour la photo de profil
const storag = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const uploa= multer({
    storage: storag,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb('Erreur : Seules les images (jpeg, jpg, png) sont acceptées !');
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 }
}).single('user_photo');
  




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

// Nouvelle méthode : Ajouter une publication
module.exports.addPublication = (req, res) => {
    upload1(req, res, async (err) => {
        if (err) {
            console.log('Erreur Multer:', err);
            return res.status(400).json({ message: err });
        }

        try {
            console.log('Données reçues:', req.body, req.file);
            const { titrePublication, description } = req.body;

            if (!titrePublication || !description) {
                return res.status(400).json({ message: 'Le titre et la description sont obligatoires' });
            }

            const publication = new Publication({
                titrePublication,
                description,
                imagePublication: req.file ? `/uploads/publications/${req.file.filename}` : null,
                author_id: req.userId,
                status: 'draft',
                datePublication: new Date(),
                tag: req.body.tag ? req.body.tag.split(',') : []
            });

            const savedPublication = await publication.save();
            res.status(201).json({ message: 'Publication ajoutée avec succès', publication: savedPublication });
        } catch (error) {
            console.log('Erreur lors de l’ajout:', error);
            res.status(500).json({ message: 'Erreur lors de l’ajout de la publication', error: error.message });
        }
    });
};


// Exportation du middleware verifyToken
module.exports.verifyToken = verifyToken;

// publication archived
module.exports.updatePublicationStatus = async (req, res) => {
    try {
        const { publicationId } = req.params;
        const { status } = req.body;

        const updatedPublication = await Publication.findByIdAndUpdate(
            publicationId,
            { status },
            { new: true } // Retourne le document mis à jour
        );

        if (!updatedPublication) {
            return res.status(404).json({ message: 'Publication not found' });
        }

        res.status(200).json(updatedPublication);
    } catch (error) {
        console.error('Error updating publication status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Récupérer toutes les publications
module.exports.getAllPublications = async (req, res) => {
    try {
        const publications = await Publication.find()
            .populate('author_id', 'username')
            .sort({ datePublication: -1 });
        res.status(200).json(publications);
    } catch (err) {
        console.error('Erreur lors de la récupération des publications:', err);
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
};


// Récupérer toutes les publications d'un psy spécifique
module.exports.getMyPublications = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'randa'); // Remplacez par votre clé secrète
        const userId = decoded.id;
        const publications = await Publication.find({ author_id: userId })
            .populate('author_id', 'username')
            .sort({ datePublication: -1 });
        res.status(200).json(publications);
    } catch (err) {
        console.error('Erreur lors de la récupération des publications:', err);
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
};


// Récupérer une  publication
module.exports.getPublicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const publication = await Publication.findById(id).populate('author_id', 'username');
        if (!publication) {
            return res.status(404).json({ message: 'Publication not found' });
        }
        res.status(200).json(publication);
    } catch (err) {
        console.error('Erreur lors de la récupération de la publication:', err);
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
};
//supprimer publication
module.exports.deletePublication = async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'randa'); // Remplacez 'randa' par votre clé secrète
        const userId = decoded.id;

        const publication = await Publication.findOneAndDelete({ _id: id, author_id: userId });
        if (!publication) {
            return res.status(404).json({ message: 'Publication not found or not authorized' });
        }
        res.status(200).json({ message: 'Publication deleted successfully' });
    } catch (err) {
        console.error('Erreur lors de la suppression de la publication:', err);
        res.status(500).json({ message: 'Erreur serveur', error: err.message });
    }
};

// Mettre à jour une publication
module.exports.updatePublication = (req, res) => {
    upload1(req, res, async (err) => {
        if (err) {
            console.log('Erreur Multer:', err);
            return res.status(400).json({ message: err });
        }

        try {
            const { id } = req.params; // ID de la publication
            const token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, 'randa'); // Vérification du token
            const userId = decoded.id;

            const publication = await Publication.findOne({ _id: id, author_id: userId });
            if (!publication) {
                return res.status(404).json({ message: 'Publication not found or not authorized' });
            }

            // Mise à jour des champs
            if (req.body.titrePublication) publication.titrePublication = req.body.titrePublication;
            if (req.body.description) publication.description = req.body.description;
            if (req.file) publication.imagePublication = `/uploads/publications/${req.file.filename}`;
            if (req.body.tag) publication.tag = req.body.tag.split(',').map(tag => tag.trim()).filter(tag => tag);

            const updatedPublication = await publication.save();
            res.status(200).json({ message: 'Publication updated successfully', publication: updatedPublication });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la publication:', error);
            res.status(500).json({ message: 'Erreur serveur', error: error.message });
        }
    });
};


// Ajouter un commentaire
module.exports.addCommentaire = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'randa');
        const userId = decoded.id;

        const { contenu, publication_id } = req.body;

        if (!contenu || !publication_id) {
            return res.status(400).json({ message: 'Le contenu et l\'ID de la publication sont requis' });
        }

        const commentaire = new Commentaire({
            contenu,
            publication_id,
            auteur_id: userId,
        });

        const savedCommentaire = await commentaire.save();
        
        // Peupler les informations de l'auteur avant de renvoyer la réponse
        const populatedCommentaire = await Commentaire.findById(savedCommentaire._id)
            .populate('auteur_id', 'username');

        res.status(201).json({ 
            message: 'Commentaire ajouté avec succès', 
            commentaire: populatedCommentaire 
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Récupérer les commentaires d'une publication
module.exports.getCommentairesByPublication = async (req, res) => {
    try {
        const { publicationId } = req.params;
        const commentaires = await Commentaire.find({ publication_id: publicationId })
            .populate('auteur_id', 'username')
            .sort({ dateCreation: -1 });

        res.status(200).json(commentaires);
    } catch (error) {
        console.error('Erreur lors de la récupération des commentaires:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
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



function generatePassword(length = 12) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        password += characters.charAt(randomIndex);
    }
    return password;
}

// Token de validation pour l'activation du compte (valide 24h) ghassen
const createValidationToken = (id) => {
    return jwt.sign({ id }, 'validation_secret', { expiresIn: '1d' });
};

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



  
  module.exports.bookappointment = async (req, res) => {
      const { psychiatristId, day, startTime, endTime } = req.body; // Changed from "date" to "day"
      const studentId = req.userId; // Changed from req.user.id to req.userId
  
      console.log('Requête reçue:', { psychiatristId, day, startTime, endTime, studentId }); // Débogage
  
      try {
          // Vérifier si les champs obligatoires sont présents
          if (!psychiatristId || !day || !startTime || !endTime) {
              return res.status(400).json({ message: 'Tous les champs (psychiatristId, day, startTime, endTime) sont requis' });
          }
  
          const psychiatrist = await User.findById(psychiatristId);
          if (!psychiatrist || psychiatrist.role !== "psychiatrist") {
              return res.status(404).json({ message: "Psychiatrist not found" });
          }
  
          console.log('Disponibilités du psychiatre:', psychiatrist.availability); // Débogage
  
          // Vérifier si le créneau est disponible
          const isAvailable = psychiatrist.availability.some(slot =>
              slot.day === day &&
              slot.startTime === startTime &&
              slot.endTime === endTime
          );
          if (!isAvailable) {
              return res.status(400).json({ message: "This slot is not available" });
          }
  
          // Vérifier s'il existe déjà une réservation pour ce créneau (éviter les doublons globaux)
          const existingAppointment = await Appointment.findOne({
              psychiatrist: psychiatristId,
              day,
              startTime,
              endTime,
          });
          if (existingAppointment) {
              return res.status(400).json({ message: 'This slot is already booked by another user.' });
          }
  
          // Créer une nouvelle réservation
          const appointment = new Appointment({
              psychiatrist: psychiatristId,
              student: studentId,
              date: new Date().toISOString().split('T')[0], // Date par défaut si nécessaire
              startTime,
              endTime,
          });
          await appointment.save();
  
          // Mettre à jour la disponibilité du psychiatre en supprimant le créneau réservé
          await User.updateOne(
              { _id: psychiatristId },
              {
                  $pull: {
                      availability: {
                          day,
                          startTime,
                          endTime,
                      },
                  },
              }
          );
  
          res.status(201).json({ message: "Appointment booked successfully", appointment });
      } catch (error) {
          console.error('Erreur dans bookAppointment:', error);
          res.status(500).json({ message: "Server error", error: error.message });
      }
  };



// Récupérer l'historique des rendez-vous pour un étudiant
module.exports.getAppointmentHistory = async (req, res) => {
    try {
        const userId = req.userId; // ID de l'utilisateur connecté, défini par verifyToken

        // Récupérer l'utilisateur pour vérifier son rôle
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        let appointments;
        if (user.role === "student") {
            // Pour un étudiant, récupérer les rendez-vous où il est le student
            appointments = await Appointment.find({ student: userId })
                .populate('psychiatrist', 'username email')
                .sort({ date: -1 })
                .exec();
        } else if (user.role === "psychiatrist") {
            // Pour un psychiatre, récupérer les rendez-vous où il est le psychiatrist
            appointments = await Appointment.find({ psychiatrist: userId })
                .populate('student', 'username email')
                .sort({ date: -1 })
                .exec();
        } else {
            return res.status(403).json({ message: "Rôle non autorisé pour voir l'historique des rendez-vous" });
        }

        if (!appointments.length) {
            return res.status(404).json({ message: "Aucun rendez-vous trouvé" });
        }

        res.status(200).json({ message: "Historique des rendez-vous récupéré avec succès", appointments, role: user.role });
    } catch (error) {
        console.error('Erreur dans getAppointmentHistory:', error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

module.exports.updateAppointmentStatus = async (req, res) => {
    try {
        const userId = req.userId; // ID de l'utilisateur connecté
        const { appointmentId } = req.params; // ID du rendez-vous à modifier
        const { status } = req.body; // Nouveau statut

        // Vérifier que le statut est valide
        const validStatuses = ['pending', 'confirmed', 'completed', 'canceled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: "Statut invalide. Les valeurs autorisées sont : 'pending', 'confirmed', 'completed', 'canceled'." });
        }

        // Vérifier si l'utilisateur est un psychiatre
        const user = await User.findById(userId);
        if (!user || user.role !== "psychiatrist") {
            return res.status(403).json({ message: "Seul un psychiatre peut modifier le statut d'un rendez-vous" });
        }

        // Vérifier si le rendez-vous existe et appartient au psychiatre
        const appointment = await Appointment.findOne({ _id: appointmentId, psychiatrist: userId });
        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé ou vous n'êtes pas autorisé à le modifier" });
        }

        // Mettre à jour le statut
        appointment.status = status;
        await appointment.save();

        res.status(200).json({ message: "Statut du rendez-vous mis à jour avec succès", appointment });
    } catch (error) {
        console.error('Erreur dans updateAppointmentStatus:', error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};


module.exports.deleteAppointment = async (req, res) => {
    try {
        const userId = req.userId; // ID de l'étudiant connecté
        const { appointmentId } = req.params; // ID du rendez-vous à supprimer

        // Vérifier si l'utilisateur est un étudiant
        const user = await User.findById(userId);
        if (!user || user.role !== "student") {
            return res.status(403).json({ message: "Seul un étudiant peut supprimer ses rendez-vous" });
        }

        // Vérifier si le rendez-vous existe et appartient à l'étudiant
        const appointment = await Appointment.findOne({ _id: appointmentId, student: userId });
        if (!appointment) {
            return res.status(404).json({ message: "Rendez-vous non trouvé ou vous n'êtes pas autorisé à le supprimer" });
        }

        // Supprimer le rendez-vous
        await Appointment.deleteOne({ _id: appointmentId });

        res.status(200).json({ message: "Rendez-vous supprimé avec succès" });
    } catch (error) {
        console.error('Erreur dans deleteAppointment:', error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
module.exports.getAllAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find();
        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error fetching all appointments:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


module.exports.Chat = async (req, res) => {
    try {
      const { roomCode, message } = req.body;
      const userId = req.userId;
      if (!roomCode || !userId || !message) {
        return res.status(400).json({ message: 'roomCode, userId, and message are required' });
      }
  
      const chatMessage = new Chat({
        chatId: uuidv4(), // Generate unique chatId
        roomCode,
        sender: userId,
        message,
      });
      await chatMessage.save();
  
      res.status(201).json({ message: 'Message added successfully', data: chatMessage });
    } catch (err) {
      console.error('Error adding message:', err);
      res.status(500).json({ message: 'Failed to add message', error: err.message });
    }
  };

  
module.exports.RoomChat = async (req, res) => {
    try {
        const { roomCode } = req.params;
        const messages = await Chat.find({ roomCode })
          .populate('sender', 'username') // Optional: Populate sender's username
          .sort({ createdAt: 1 }); // Sort by creation time
    
        res.status(200).json(messages);
      } catch (err) {
        console.error('Error retrieving messages:', err);
        res.status(500).json({ message: 'Failed to retrieve messages', error: err.message });
      }
    };