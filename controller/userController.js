const User = require('../model/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const sendEmail = require('../utils/emailSender');
const multer = require('multer');
const path = require('path');
const Publication = require('../model/publication'); // Assurez-vous que le chemin est correct
const ReportPublication = require('../model/ReportPublication');
const Appointment = require("../model/appointment");
const Chat = require("../model/chat");
const Problem = require('../model/problem'); // Add Problem model
const AttendanceSheet = require('../model/attendanceSheet'); // Add Problem model
const Notification = require('../model/Notification'); // Import the new Notification model

const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron'); 


const Commentaire = require('../model/commentaire'); // Importer le modèle Commentaire
const CommentReport = require('../model/CommentReport');

dotenv.config();

// JWT config
const maxAge = 1 * 60 * 60; // 1 heure
const createtoken = (id, role,username) => {
    return jwt.sign({ id, role, username }, 'randa', { expiresIn: maxAge });
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
        req.userRole = decoded.role; 
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

        const token = createtoken(user._id, user.role,user.username);
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
            availability: user.availability,
            receiveEmails: user.receiveEmails // Ajouté ici
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

module.exports.updatePsychiatristDescription = async (req, res) => {
    try {
        const userId = req.params.id;
        const { description } = req.body;

        // Vérifier si l'utilisateur existe et est un psychiatre
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        if (user.role !== "psychiatrist") {
            return res.status(403).json({ message: "Action réservée aux psychiatres" });
        }

        // Vérifier si une description est fournie
        if (!description) {
            return res.status(400).json({ message: "La description est requise" });
        }

        // Mettre à jour la description
        user.description = description;
        const updatedUser = await user.save();

        res.status(200).json({
            message: "Description mise à jour avec succès",
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

// Nouvelle route pour mettre à jour la préférence email
module.exports.updateReceiveEmails = async (req, res) => {
    try {
        const userId = req.params.id;
        const { receiveEmails } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
        user.receiveEmails = receiveEmails;
        const updatedUser = await user.save();
        res.status(200).json({ message: "Préférence email mise à jour avec succès", user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};



module.exports.addPublication = (req, res) => {
    upload1(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err });

        try {
            const { titrePublication, description, tag, scheduledDate } = req.body;

            if (!titrePublication || !description) {
                return res.status(400).json({ message: 'The title and description are required' });
            }

            // Déterminer le statut et la date de publication
            let status = 'draft';
            let datePublication = new Date();

            if (scheduledDate && scheduledDate !== 'now') {
                const scheduledTime = new Date(scheduledDate);
                if (scheduledTime > new Date()) {
                    status = 'later'; // Si la date est future, statut = archived
                    datePublication = scheduledTime; // La date de publication est la date planifiée
                } else {
                    status = 'published'; // Si la date est passée ou actuelle, publier immédiatement
                }
            } else {
                status = 'published'; // Si "now" ou pas de scheduledDate, publier immédiatement
            }

            const publication = new Publication({
                titrePublication,
                description,
                imagePublication: req.file ? `/uploads/publications/${req.file.filename}` : null,
                author_id: req.userId,
                status,
                datePublication,
                tag: tag ? tag.split(',') : [],
            });

            const savedPublication = await publication.save();

            // Si la publication est publiée immédiatement, envoyer les emails
            if (status === 'published') {
                const students = await User.find({ role: 'student', receiveEmails: true });
                if (students.length > 0) {
                    const publicationLink = `http://localhost:3000/PublicationDetailPsy/${savedPublication._id}`;
                    const subject = 'New Publication Added on EspritCare';
                    const htmlContent = `
                        <h2>New Publication Available!</h2>
                        <p>Hello</p>
                        <p>A new publication has been added by a psychiatrist on EspritCare:</p>
                        <ul>
                            <li><strong>Title :</strong> ${titrePublication}</li>
                            <li><strong>Description :</strong> ${description}</li>
                        </ul>
                        <p>Click on the link below to view it:</p>
                        <a href="${publicationLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #0ea5e6; color: #fff; text-decoration: none; border-radius: 5px;">
                            View Publication
                        </a>
                        <p>Stay connected for more updates!</p>
                    `;
                    const emailPromises = students.map(student =>
                        sendEmail(student.email, subject, htmlContent)
                            .catch(err => console.error(`Erreur lors de l’envoi à ${student.email} :`, err))
                    );
                    await Promise.all(emailPromises);
                    console.log(`Emails envoyés à ${students.length} étudiants.`);
                }
            }

            res.status(201).json({ message: 'Publication added successfully', publication: savedPublication });
        } catch (error) {
            res.status(500).json({ message: 'Erreur lors de l’ajout de la publication', error: error.message });
        }
    });
};

// Tâche cron pour vérifier et publier les publications archivées
cron.schedule('* * * * *', async () => { // Exécute toutes les minutes (ajustez selon vos besoins)
    try {
        const now = new Date();
        const archivedPublications = await Publication.find({
            status: 'later',
            datePublication: { $lte: now }, // Publications dont la date est atteinte ou dépassée
        });

        for (const publication of archivedPublications) {
            publication.status = 'published';
            await publication.save();

            // Envoyer des emails aux étudiants une fois publiée
            const students = await User.find({ role: 'student', receiveEmails: true });
            if (students.length > 0) {
                const publicationLink = `http://localhost:3000/PublicationDetailPsy/${publication._id}`;
                const subject = 'New Publication Added on EspritCare';
                const htmlContent = `
                    <h2>New Publication Available!</h2>
                    <p>Hello</p>
                    <p>A new publication has been added by a psychiatrist on EspritCare:</p>
                    <ul>
                        <li><strong>Title :</strong> ${publication.titrePublication}</li>
                        <li><strong>Description :</strong> ${publication.description}</li>
                    </ul>
                    <p>Click on the link below to view it:</p>
                    <a href="${publicationLink}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #0ea5e6; color: #fff; text-decoration: none; border-radius: 5px;">
                        View Publication
                    </a>
                    <p>Stay connected for more updates!</p>
                `;
                const emailPromises = students.map(student =>
                    sendEmail(student.email, subject, htmlContent)
                        .catch(err => console.error(`Erreur lors de l’envoi à ${student.email} :`, err))
                );
                await Promise.all(emailPromises);
                console.log(`Publication ${publication._id} publiée et emails envoyés à ${students.length} étudiants.`);
            }
        }
    } catch (error) {
        console.error('Erreur dans la tâche cron de publication:', error);
    }
});


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

// Épingler ou désépingler une publication pour l'utilisateur connecté
module.exports.togglePinPublication = async (req, res) => {
    try {
        const { publicationId } = req.params;
        const userId = req.userId; // Récupéré via le middleware verifyToken

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const publication = await Publication.findById(publicationId);
        if (!publication) {
            return res.status(404).json({ message: 'Publication non trouvée' });
        }

        const isPinned = user.pinnedPublications.includes(publicationId);
        if (isPinned) {
            user.pinnedPublications = user.pinnedPublications.filter(id => id.toString() !== publicationId);
            await user.save();
            return res.status(200).json({ message: 'Publication unpinned successfully' });
        } else {
            user.pinnedPublications.push(publicationId);
            await user.save();
            return res.status(200).json({ message: 'Publication pinned successfully' });
        }
    } catch (error) {
        console.error('Erreur lors de la gestion de l’épinglage:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Récupérer les publications épinglées de l'utilisateur connecté
module.exports.getPinnedPublications = async (req, res) => {
    try {
        const userId = req.userId; // Récupéré via verifyToken
        const user = await User.findById(userId).populate('pinnedPublications');
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.status(200).json(user.pinnedPublications);
    } catch (error) {
        console.error('Erreur lors de la récupération des publications épinglées:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// getAllPublications reste inchangé car il ne doit pas être affecté par les pins individuels
module.exports.getAllPublications = async (req, res) => {
    try {
        const { sort } = req.query;
        const sortOrder = sort === 'oldest' ? 1 : -1;

        const publications = await Publication.aggregate([
            {
                $lookup: {
                    from: 'commentaires',
                    localField: '_id',
                    foreignField: 'publication_id',
                    as: 'commentaires',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author_id',
                    foreignField: '_id',
                    as: 'author_id',
                },
            },
            {
                $unwind: { path: '$author_id', preserveNullAndEmptyArrays: true },
            },
            {
                $sort: { datePublication: sortOrder },
            },
            {
                $project: {
                    titrePublication: 1,
                    description: 1,
                    imagePublication: 1,
                    datePublication: 1,
                    tag: 1,
                    status: 1,
                    'author_id._id': 1,
                    'author_id.username': 1,
                    commentsCount: { $size: '$commentaires' },
                    likeCount: 1,
                    dislikeCount: 1,
                },
            },
        ]);

        const filteredPublications = publications.filter(post => post.status !== 'archived');
        res.status(200).json(filteredPublications);
    } catch (error) {
        console.error('Erreur lors de la récupération des publications:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
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


// Récupérer une publication par ID (mise à jour pour inclure Likes/Dislikes)
module.exports.getPublicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization?.split(' ')[1]; // Récupérer le token (optionnel)
        let userId = null;

        // Décoder le token pour obtenir l'ID de l'utilisateur (si connecté)
        if (token) {
            const decoded = jwt.verify(token, 'randa');
            userId = decoded.id;
        }

        // Récupérer la publication
        const publication = await Publication.findById(id);
        if (!publication) {
            return res.status(404).json({ message: 'Publication non trouvée' });
        }

        // Vérifier si l'utilisateur est connecté et s'il n'a pas encore vu la publication
        if (userId) {
            if (!publication.viewedBy) publication.viewedBy = []; // Initialiser viewedBy si vide
            if (!publication.viewedBy.includes(userId)) {
                publication.viewCount += 1; // Incrémenter uniquement la première fois
                publication.viewedBy.push(userId); // Ajouter l'utilisateur à viewedBy
                await publication.save();
            }
        }
        // Note : Si l'utilisateur n'est pas connecté (pas de token), on n'incrémente pas viewCount.
        // Si vous voulez compter les vues anonymes différemment, précisez-le-moi.

        // Peupler les champs nécessaires après mise à jour
        const populatedPublication = await Publication.findById(id)
            .populate('author_id', 'username user_photo')
            .populate('likes', 'username')
            .populate('dislikes', 'username');

        res.status(200).json(populatedPublication);
    } catch (error) {
        console.error('Erreur lors de la récupération de la publication:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
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

            // Gestion du statut et de la date programmée
            if (req.body.status) {
                publication.status = req.body.status;
                if (req.body.status === 'published') {
                    publication.scheduledDate = null; // Réinitialiser la date programmée
                    publication.datePublication = new Date(); // Mettre à jour la date de publication à maintenant
                } else if (req.body.status === 'later' && req.body.scheduledDate) {
                    publication.scheduledDate = new Date(req.body.scheduledDate); // Définir la date programmée
                }
            }

            const updatedPublication = await publication.save();
            res.status(200).json({ message: 'Publication updated successfully', publication: updatedPublication });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la publication:', error);
            res.status(500).json({ message: 'Erreur serveur', error: error.message });
        }
    });
};


//ban
module.exports.banUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { days, reason, customReason } = req.body;

        // Vérification des permissions
        if (req.userRole !== "admin" && req.userRole !== "psychiatrist") {
            return res.status(403).json({ message: "Permission refusée" });
        }

        // Validation des champs requis
        if (!userId || !days || !reason) {
            return res.status(400).json({ message: "L'ID utilisateur, le nombre de jours et la raison sont requis" });
        }

        if (reason === "other" && !customReason) {
            return res.status(400).json({ message: "Une raison personnalisée est requise pour 'other'" });
        }

        // Trouver l'utilisateur
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        // Calculer la date d'expiration du bannissement
        const daysInt = parseInt(days);
        if (isNaN(daysInt) || daysInt <= 0) {
            return res.status(400).json({ message: "Le nombre de jours doit être un entier positif" });
        }

        const banExpiration = new Date();
        banExpiration.setDate(banExpiration.getDate() + daysInt);

        // Déterminer la raison finale
        const finalReason = reason === "other" && customReason ? customReason : reason;

        // Mettre à jour l'utilisateur
        user.isBanned = true;
        user.banExpiration = banExpiration;
        user.banReason = finalReason;

        const updatedUser = await user.save();

        // Envoyer un email à l'utilisateur banni
        const subject = "Vous avez été banni d'EspritCare";
        const htmlContent = `
            <h2>Notification de bannissement</h2>
            <p>Bonjour ${user.username},</p>
            <p>Votre compte sur EspritCare a été banni pour la raison suivante :</p>
            <ul>
                <li><strong>Raison :</strong> ${finalReason}</li>
                <li><strong>Durée :</strong> ${daysInt} jour${daysInt > 1 ? 's' : ''}</li>
                <li><strong>Expiration :</strong> ${banExpiration.toLocaleString()}</li>
            </ul>
            <p>Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre support à support@espritcare.com.</p>
            <p>Cordialement,<br>L'équipe EspritCare</p>
        `;

        try {
            await sendEmail(user.email, subject, htmlContent);
            console.log(`Email de bannissement envoyé à ${user.email}`);
        } catch (emailErr) {
            console.error(`Erreur lors de l'envoi de l'email à ${user.email} :`, emailErr);
            // Ne pas bloquer la réponse en cas d'échec d'email
        }

        // Réponse au client
        res.status(200).json({
            message: "Utilisateur banni avec succès",
            user: {
                _id: updatedUser._id,
                username: updatedUser.username,
                isBanned: updatedUser.isBanned,
                banExpiration: updatedUser.banExpiration,
                banReason: updatedUser.banReason,
            },
        });
    } catch (err) {
        console.error("Erreur lors du bannissement de l'utilisateur:", err);
        res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
};

// Vérifier le statut de bannissement avant d'ajouter un commentaire
module.exports.addCommentaire = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'randa');
        const userId = decoded.id;

        // Vérifier si l'utilisateur est banni
        const user = await User.findById(userId);
        if (user.isBanned && user.banExpiration && new Date() < user.banExpiration) {
            return res.status(403).json({
                message: `Vous êtes banni jusqu'au ${user.banExpiration.toLocaleString()} pour la raison suivante : ${user.banReason}`,
            });
        }

        const { contenu, publication_id, isAnonymous } = req.body;

        if (!contenu || !publication_id) {
            return res.status(400).json({ message: "Le contenu et l'ID de la publication sont requis" });
        }

        const commentaire = new Commentaire({
            contenu,
            publication_id,
            auteur_id: userId,
            isAnonymous: isAnonymous || false,
        });

        const savedCommentaire = await commentaire.save();
        const populatedCommentaire = await Commentaire.findById(savedCommentaire._id)
            .populate('auteur_id', 'username user_photo');

        const responseCommentaire = populatedCommentaire.isAnonymous
            ? {
                ...populatedCommentaire.toObject(),
                auteur_id: {
                    _id: populatedCommentaire.auteur_id._id,
                    username: 'Anonyme',
                    user_photo: null,
                },
            }
            : populatedCommentaire;

        res.status(201).json({
            message: "Commentaire ajouté avec succès",
            commentaire: responseCommentaire,
        });
    } catch (error) {
        console.error("Erreur lors de l'ajout du commentaire:", error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};


// getBannedUsers
module.exports.getBannedUsers = async (req, res) => {
    try {
        // Vérification des permissions
        if (req.userRole !== "admin" && req.userRole !== "psychiatrist") {
            return res.status(403).json({ message: "Permission refusée" });
        }

        // Récupérer les utilisateurs bannis
        const bannedUsers = await User.find({
            isBanned: true,
            banExpiration: { $gte: new Date() } // Seuls les bannissements actifs
        }).select('username email banExpiration banReason');

        res.status(200).json({
            message: "Liste des utilisateurs bannis récupérée avec succès",
            bannedUsers
        });
    } catch (err) {
        console.error("Erreur lors de la récupération des utilisateurs bannis:", err);
        res.status(500).json({ message: "Erreur serveur", error: err.message });
    }
};

// Récupérer les commentaires
module.exports.getCommentairesByPublication = async (req, res) => {
    try {
        const { publicationId } = req.params;
        const commentaires = await Commentaire.find({ publication_id: publicationId })
            .populate('auteur_id', 'username user_photo')
            .sort({ dateCreation: -1 });

        const formattedCommentaires = commentaires.map(comment => {
            if (comment.isAnonymous) {
                return {
                    ...comment.toObject(), // Convertir en objet JS
                    auteur_id: {
                        _id: comment.auteur_id._id, // Conserver l'_id
                        username: 'Anonyme',
                        user_photo: null
                    }
                };
            }
            return comment;
        });

        res.status(200).json(formattedCommentaires);
    } catch (error) {
        console.error('Erreur lors de la récupération des commentaires:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Mettre à jour un commentaire
module.exports.updateCommentaire = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { contenu } = req.body;
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'randa');
        const userId = decoded.id;

        if (!contenu) {
            return res.status(400).json({ message: 'Le contenu est requis' });
        }

        const commentaire = await Commentaire.findOne({ _id: commentId, auteur_id: userId });
        if (!commentaire) {
            return res.status(404).json({ message: 'Commentaire non trouvé ou vous n’êtes pas autorisé à le modifier' });
        }

        commentaire.contenu = contenu;
        const updatedCommentaire = await commentaire.save();

        res.status(200).json({ message: 'Commentaire mis à jour avec succès', commentaire: updatedCommentaire });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du commentaire:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Supprimer un commentaire
module.exports.deleteCommentaire = async (req, res) => {
    try {
        const { commentId } = req.params;
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'randa');
        const userId = decoded.id;

        const commentaire = await Commentaire.findOneAndDelete({ _id: commentId, auteur_id: userId });
        if (!commentaire) {
            return res.status(404).json({ message: 'Commentaire non trouvé ou vous n’êtes pas autorisé à le supprimer' });
        }

        res.status(200).json({ message: 'Commentaire supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du commentaire:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Supprimer un commentaire (réservé aux administrateurs)
module.exports.deleteCommentaireAdmin = async (req, res) => {
    try {
        const { commentId } = req.params;
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, 'randa');
        const userId = decoded.id;

        // Récupérer l'utilisateur pour vérifier son rôle
        const user = await User.findById(userId); // Assurez-vous que le modèle User est importé
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier si l'utilisateur est un administrateur
        if (user.role !== 'admin') { // Assurez-vous que le champ 'role' existe dans votre modèle User
            return res.status(403).json({ message: 'Accès refusé : seuls les administrateurs peuvent supprimer des commentaires' });
        }

        // Supprimer le commentaire sans vérifier l'auteur
        const commentaire = await Commentaire.findByIdAndDelete(commentId);
        if (!commentaire) {
            return res.status(404).json({ message: 'Commentaire non trouvé' });
        }

        res.status(200).json({ message: 'Commentaire supprimé avec succès par l\'administrateur' });
    } catch (error) {
        console.error('Erreur lors de la suppression du commentaire par l\'administrateur:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Dans votre controller (par exemple, publicationController.js)
module.exports.getPublicationsByTags = async (req, res) => {
    try {
        const { tags } = req.body;
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return res.status(400).json({ message: 'Tags are required' });
        }

        const publications = await Publication.find({
            tag: { $in: tags }, // Recherche les publications avec au moins un tag correspondant
        }).limit(10); // Limite à 10 résultats (ajustable)

        res.status(200).json(publications);
    } catch (error) {
        console.error('Error fetching publications by tags:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// controller.js

module.exports.likePublication = async (req, res) => {
    try {
        const { publicationId } = req.params;
        const userId = req.userId;

        const publication = await Publication.findById(publicationId);
        if (!publication) {
            return res.status(404).json({ message: 'Publication non trouvée' });
        }

        if (publication.likes.includes(userId)) {
            return res.status(400).json({ message: 'Vous avez déjà aimé cette publication' });
        }

        if (publication.dislikes.includes(userId)) {
            publication.dislikes.pull(userId);
            publication.dislikeCount -= 1;
        }

        publication.likes.push(userId);
        publication.likeCount += 1;

        const updatedPublication = await publication.save();
        // Populer author_id avant de renvoyer
        const populatedPublication = await Publication.findById(updatedPublication._id)
            .populate('author_id', 'username user_photo');

        res.status(200).json({ 
            message: 'Publication aimée avec succès', 
            publication: populatedPublication 
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout du Like:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

module.exports.dislikePublication = async (req, res) => {
    try {
        const { publicationId } = req.params;
        const userId = req.userId;

        const publication = await Publication.findById(publicationId);
        if (!publication) {
            return res.status(404).json({ message: 'Publication non trouvée' });
        }

        if (publication.dislikes.includes(userId)) {
            return res.status(400).json({ message: 'Vous avez déjà désapprouvé cette publication' });
        }

        if (publication.likes.includes(userId)) {
            publication.likes.pull(userId);
            publication.likeCount -= 1;
        }

        publication.dislikes.push(userId);
        publication.dislikeCount += 1;

        const updatedPublication = await publication.save();
        // Populer author_id avant de renvoyer
        const populatedPublication = await Publication.findById(updatedPublication._id)
            .populate('author_id', 'username user_photo');

        res.status(200).json({ 
            message: 'Publication désapprouvée avec succès', 
            publication: populatedPublication 
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout du Dislike:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Ajouter ou supprimer une publication des favoris
module.exports.toggleFavorite = async (req, res) => {
    try {
        const { publicationId } = req.params;
        const userId = req.userId; // Récupéré via verifyToken

        const user = await User.findById(userId);
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Seuls les étudiants peuvent gérer leurs favoris' });
        }

        const publication = await Publication.findById(publicationId);
        if (!publication) {
            return res.status(404).json({ message: 'Publication non trouvée' });
        }

        const isFavorite = user.favorites.includes(publicationId);
        if (isFavorite) {
            user.favorites = user.favorites.filter(id => id.toString() !== publicationId);
        } else {
            user.favorites.push(publicationId);
        }

        await user.save();
        res.status(200).json({
            message: isFavorite ? 'Removed from favorites' : 'Added to favorites',
            favorites: user.favorites,
        });
    } catch (error) {
        console.error('Erreur lors de la gestion des favoris:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Récupérer les publications favorites d'un étudiant
module.exports.getFavoritePublications = async (req, res) => {
    try {
        const userId = req.userId; // Récupéré via verifyToken

        const user = await User.findById(userId).populate({
            path: 'favorites',
            populate: { path: 'author_id', select: 'username user_photo' },
        });

        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Seuls les étudiants peuvent voir leurs favoris' });
        }

        const favoritePublications = user.favorites.filter(post => post.status !== 'archived');
        res.status(200).json(favoritePublications);
    } catch (error) {
        console.error('Erreur lors de la récupération des favoris:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

module.exports.searchPublications = async (req, res) => {
    try {
        const { searchTerm } = req.query;
        if (!searchTerm) {
            return res.status(400).json({ message: 'Un terme de recherche est requis' });
        }

        const publications = await Publication.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'author_id',
                    foreignField: '_id',
                    as: 'author_id'
                }
            },
            {
                $unwind: { path: '$author_id', preserveNullAndEmptyArrays: true }
            },
            {
                $match: {
                    $or: [
                        { titrePublication: { $regex: searchTerm, $options: 'i' } },
                        { 'author_id.username': { $regex: searchTerm, $options: 'i' } }
                    ],
                    status: { $ne: 'archived' }
                }
            },
            {
                $sort: { datePublication: -1 }
            },
            {
                $project: {
                    titrePublication: 1,
                    description: 1,
                    imagePublication: 1,
                    datePublication: 1,
                    tag: 1,
                    status: 1,
                    'author_id._id': 1,
                    'author_id.username': 1,
                    commentsCount: 1,
                    likeCount: 1,
                    dislikeCount: 1
                }
            }
        ]);

        res.status(200).json(publications);
    } catch (error) {
        console.error('Erreur lors de la recherche des publications:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};



// Ajouter un signalement
module.exports.addReport = async (req, res) => {
    try {
        const { id } = req.params; // ID de la publication à signaler
        const { reason, customReason } = req.body;
        const userId = req.userId; // Récupéré via verifyToken

        const publication = await Publication.findById(id);
        if (!publication) {
            return res.status(404).json({ message: 'Publication non trouvée' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const existingReport = await ReportPublication.findOne({ publicationId: id, userId });
        if (existingReport) {
            return res.status(400).json({ message: 'Vous avez déjà signalé cette publication' });
        }

        const report = new ReportPublication({
            publicationId: id,
            userId,
            reason,
            customReason: reason === 'other' ? customReason : undefined,
        });

        const savedReport = await report.save();

        res.status(201).json({
            message: 'Signalement ajouté avec succès',
            report: savedReport,
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout du signalement:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Erreur de validation', error: error.message });
        }
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Récupérer tous les signalements (pour admin ou psy, par exemple)
module.exports.getAllReports = async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;

        if (userRole !== 'admin' && userRole !== 'psychiatrist') {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const reports = await ReportPublication.find()
            .populate('publicationId', 'titrePublication description')
            .populate('userId', 'username email')
            .sort({ dateReported: -1 });

        res.status(200).json(reports);
    } catch (error) {
        console.error('Erreur lors de la récupération des signalements:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Récupérer les signalements d'une publication spécifique
module.exports.getReportsByPublication = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const userRole = req.userRole;

        const publication = await Publication.findById(id);
        if (!publication) {
            return res.status(404).json({ message: 'Publication non trouvée' });
        }

        if (userRole !== 'admin' && userRole !== 'psychiatrist' && publication.author_id.toString() !== userId) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const reports = await ReportPublication.find({ publicationId: id })
            .populate('userId', 'username email')
            .sort({ dateReported: -1 });

        res.status(200).json(reports);
    } catch (error) {
        console.error('Erreur lors de la récupération des signalements:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Supprimer un signalement (pour admin ou psy)
module.exports.deleteReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        const userRole = req.userRole;

        if (userRole !== 'admin' && userRole !== 'psychiatrist') {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const report = await ReportPublication.findByIdAndDelete(reportId);
        if (!report) {
            return res.status(404).json({ message: 'Signalement non trouvé' });
        }

        res.status(200).json({ message: 'Signalement supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du signalement:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};



// Ajouter un signalement pour un commentaire
module.exports.addCommentReport = async (req, res) => {
    try {
        const { commentId } = req.params; // ID du commentaire à signaler
        const { reason, customReason } = req.body;
        const userId = req.userId; // Récupéré via verifyToken

        // Vérifier si le commentaire existe
        const comment = await Commentaire.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Commentaire non trouvé' });
        }

        // Vérifier si l'utilisateur existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        // Vérifier si l'utilisateur a déjà signalé ce commentaire
        const existingReport = await CommentReport.findOne({ commentId, userId });
        if (existingReport) {
            return res.status(400).json({ message: 'Vous avez déjà signalé ce commentaire' });
        }

        // Créer un nouveau signalement
        const report = new CommentReport({
            commentId,
            userId,
            reason,
            customReason: reason === 'other' ? customReason : undefined,
        });

        const savedReport = await report.save();

        res.status(201).json({
            message: 'Signalement ajouté avec succès',
            report: savedReport,
        });
    } catch (error) {
        console.error('Erreur lors de l’ajout du signalement du commentaire:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Erreur de validation', error: error.message });
        }
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Récupérer tous les signalements de commentaires (pour admin ou psy)
module.exports.getAllCommentReports = async (req, res) => {
    try {
        const userId = req.userId;
        const userRole = req.userRole;

        // Vérifier les autorisations
        if (userRole !== 'admin' && userRole !== 'psychiatrist') {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const reports = await CommentReport.find()
            .populate('commentId', 'contenu publication_id')
            .populate('userId', 'username email')
            .sort({ dateReported: -1 });

        res.status(200).json(reports);
    } catch (error) {
        console.error('Erreur lors de la récupération des signalements de commentaires:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error.message });
    }
};

// Récupérer les signalements d'un commentaire spécifique
module.exports.getReportsByComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userId;
        const userRole = req.userRole;

        // Vérifier si le commentaire existe
        const comment = await Commentaire.findById(commentId).populate('publication_id');
        if (!comment) {
            return res.status(404).json({ message: 'Commentaire non trouvé' });
        }

        // Vérifier les autorisations
        // Seuls les admins, les psychiatres, ou l'auteur de la publication associée peuvent voir les signalements
        if (
            userRole !== 'admin' &&
            userRole !== 'psychiatrist' &&
            comment.publication_id.author_id.toString() !== userId
        ) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }

        const reports = await CommentReport.find({ commentId })
            .populate('userId', 'username email')
            .sort({ dateReported: -1 });

        res.status(200).json(reports);
    } catch (error) {
        console.error('Erreur lors de la récupération des signalements du commentaire:', error);
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
    const { date, startTime, endTime } = req.body;
    const userId = req.params.id;
  
    if (req.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: You can only modify your own availability' });
    }
  
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.role !== 'psychiatrist') {
        return res.status(403).json({ message: 'This action is only allowed for psychiatrists' });
      }
  
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ message: 'Date, startTime, and endTime are required' });
      }
  
      const availabilityDate = new Date(date);
      if (isNaN(availabilityDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
      }
  
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute) ||
          startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59 ||
          endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59) {
        return res.status(400).json({ message: 'Invalid time format. Use HH:MM' });
      }
  
      if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      availabilityDate.setHours(0, 0, 0, 0); // Normalize for comparison
      if (availabilityDate < today) {
        return res.status(400).json({ message: 'Cannot set availability for a past date' });
      }
  
      user.availability.push({ date: availabilityDate, startTime, endTime });
      const updatedUser = await user.save();
  
      res.status(200).json({ message: 'Availability added successfully', user: updatedUser });
    } catch (error) {
      console.error('Error adding availability:', error); // Log the error
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

module.exports.deleteAvailability = async (req, res) => {
    const userId = req.params.id;
    const slotIndex = parseInt(req.params.index, 10);
  
    if (req.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: You can only modify your own availability' });
    }
  
    try {
      const user = await User.findById(userId);
      if (!user || user.role !== 'psychiatrist') {
        return res.status(404).json({ message: 'Psychiatrist not found' });
      }
  
      if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= user.availability.length) {
        return res.status(400).json({ message: 'Invalid availability slot index' });
      }
  
      user.availability.splice(slotIndex, 1);
      const updatedUser = await user.save();
  
      res.status(200).json({ message: 'Availability deleted successfully', user: updatedUser });
    } catch (error) {
      console.error('Error deleting availability:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };  
  module.exports.updateAvailability = async (req, res) => {
    const { date, startTime, endTime } = req.body;
    const userId = req.params.id;
    const slotIndex = parseInt(req.params.index, 10);
  
    if (req.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: You can only modify your own availability' });
    }
  
    try {
      const user = await User.findById(userId);
      if (!user || user.role !== 'psychiatrist') {
        return res.status(404).json({ message: 'Psychiatrist not found' });
      }
  
      if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= user.availability.length) {
        return res.status(400).json({ message: 'Invalid availability slot index' });
      }
  
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ message: 'Date, startTime, and endTime are required' });
      }
  
      const availabilityDate = new Date(date);
      if (isNaN(availabilityDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
  
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute) ||
          startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59 ||
          endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59) {
        return res.status(400).json({ message: 'Invalid time format' });
      }
  
      if (startHour > endHour || (startHour === endHour && startMinute >= endMinute)) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (availabilityDate < today) {
        return res.status(400).json({ message: 'Cannot set availability for a past date' });
      }
  
      user.availability[slotIndex] = { date: availabilityDate, startTime, endTime };
      const updatedUser = await user.save();
  
      res.status(200).json({ message: 'Availability updated successfully', user: updatedUser });
    } catch (error) {
      console.error('Error updating availability:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
 
  // Utility function to schedule a reminder
const scheduleReminder = async (appointment, studentId) => {
    const appointmentTime = new Date(`${appointment.date.toISOString().split('T')[0]}T${appointment.startTime}:00Z`);
    const reminderTime = new Date(appointmentTime.getTime() - 5 * 60 * 1000); // 5 minutes before
    const now = new Date();
  
    const timeUntilReminder = reminderTime - now;
    if (timeUntilReminder > 0) {
      setTimeout(async () => {
        try {
          const student = await User.findById(studentId);
          const psychiatrist = await User.findById(appointment.psychiatrist);
          const message = `Reminder: Your appointment with ${psychiatrist.username} starts in 5 minutes!`;
          
          // Store the reminder notification
          await Notification.create({
            userId: studentId,
            message,
            type: 'reminder',
            appointmentId: appointment._id,
          });
  
          console.log(`Reminder scheduled for ${student.email}: ${message}`);
          // Optionally, send an email or push notification here
        } catch (error) {
          console.error('Error scheduling reminder:', error);
        }
      }, timeUntilReminder);
    }
  };




module.exports.bookAppointment = async (req, res) => {
    const { psychiatristId, date, startTime, endTime } = req.body;
    const studentId = req.userId;

    console.log('Request received:', { psychiatristId, date, startTime, endTime, studentId });

    try {
        if (!psychiatristId || !date || !startTime || !endTime) {
            return res.status(400).json({ message: 'All fields (psychiatristId, date, startTime, endTime) are required' });
        }

        const psychiatrist = await User.findById(psychiatristId);
        if (!psychiatrist || psychiatrist.role !== "psychiatrist") {
            return res.status(404).json({ message: "Psychiatrist not found" });
        }

        const student = await User.findById(studentId);
        if (!student || student.role !== "student") {
            return res.status(404).json({ message: "Student not found" });
        }

        // Parse the date (assuming "DD/MM/YYYY" format from frontend)
        const [day, month, year] = date.split('/').map(Number);
        const parsedDate = new Date(year, month - 1, day);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format. Use DD/MM/YYYY" });
        }

        // Convert requested times to minutes for comparison
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        const requestedStartMinutes = startHour * 60 + startMinute;
        const requestedEndMinutes = endHour * 60 + endMinute;

        // Check if the requested slot falls within an available slot
        const slotIndex = psychiatrist.availability.findIndex(slot => {
            const slotDate = new Date(slot.date || slot.day);
            const [slotStartHour, slotStartMinute] = slot.startTime.split(':').map(Number);
            const [slotEndHour, slotEndMinute] = slot.endTime.split(':').map(Number);
            const slotStartMinutes = slotStartHour * 60 + slotStartMinute;
            const slotEndMinutes = slotEndHour * 60 + slotEndMinute;

            return (
                slotDate.toDateString() === parsedDate.toDateString() &&
                requestedStartMinutes >= slotStartMinutes &&
                requestedEndMinutes <= slotEndMinutes
            );
        });

        if (slotIndex === -1) {
            return res.status(400).json({ message: "This slot is not available" });
        }

        // Check for existing appointment
        const existingAppointment = await Appointment.findOne({
            psychiatrist: psychiatristId,
            date: parsedDate,
            startTime,
            endTime,
        });
        if (existingAppointment) {
            return res.status(400).json({ message: 'This slot is already booked' });
        }

        // Create new appointment
        const appointment = new Appointment({
            psychiatrist: psychiatristId,
            student: studentId,
            date: parsedDate,
            startTime,
            endTime,
        });

        // Update the availability: split the original slot if necessary
        const originalSlot = psychiatrist.availability[slotIndex];
        const [slotStartHour, slotStartMinute] = originalSlot.startTime.split(':').map(Number);
        const [slotEndHour, slotEndMinute] = originalSlot.endTime.split(':').map(Number);
        const slotStartMinutes = slotStartHour * 60 + slotStartMinute;
        const slotEndMinutes = slotEndHour * 60 + slotEndMinute;

        // Remove the original slot
        psychiatrist.availability.splice(slotIndex, 1);

        // Add new slots before and after the booked slot, if applicable
        if (requestedStartMinutes > slotStartMinutes) {
            psychiatrist.availability.push({
                date: originalSlot.date,
                startTime: originalSlot.startTime,
                endTime: startTime,
            });
        }
        if (requestedEndMinutes < slotEndMinutes) {
            psychiatrist.availability.push({
                date: originalSlot.date,
                startTime: endTime,
                endTime: originalSlot.endTime,
            });
        }

        // Save the appointment first to get its ID
        await appointment.save();

        // Create a notification for the psychiatrist
        const notification = new Notification({
            userId: psychiatristId, // Changed from "user" to "userId"
            message: `A new appointment has been booked by ${student.username || 'a student'} on ${parsedDate.toLocaleDateString()} from ${startTime} to ${endTime}.`,
            type: 'new_appointment', // Required field, set to "new_appointment"
            appointmentId: appointment._id, // Link to the appointment
            read: false, // Default value, optional since schema sets it
        });

        // Save the psychiatrist's updated availability and the notification
        await Promise.all([psychiatrist.save(), notification.save()]);

        res.status(201).json({
            message: "Appointment booked successfully",
            appointment,
        });
    } catch (error) {
        console.error('Error in bookAppointment:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// Récupérer l'historique des rendez-vous pour un étudiant
module.exports.getAppointmentHistory = async (req, res) => {
    try {
        // Ensure req.userId and req.userRole are set by verifyToken
        if (!req.userId || !req.userRole) {
            console.error('Missing userId or userRole:', { userId: req.userId, userRole: req.userRole });
            return res.status(401).json({ message: 'User authentication failed' });
        }

        const userId = req.userId;
        const userRole = req.userRole;
        console.log('User ID:', userId, 'Role:', userRole); // Debug

        // Fetch user
        let user;
        try {
            user = await User.findById(userId);
            console.log('Fetched User:', user); // Debug
        } catch (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ message: 'Error querying user database', error: err.message });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Build query based on role
        let query = {};
        if (userRole === 'student') {
            query.student = userId;
        } else if (userRole === 'psychiatrist') {
            query.psychiatrist = userId;
        } else {
            return res.status(403).json({ message: 'Invalid role' });
        }

        // Extract filter parameters
        const { statusFilter, searchName } = req.query;
        console.log('Filter Params:', { statusFilter, searchName }); // Debug

        // Apply status filter
        if (statusFilter && statusFilter !== 'all') {
            if (!['pending', 'confirmed', 'canceled', 'completed'].includes(statusFilter)) {
                return res.status(400).json({ message: 'Invalid status value' });
            }
            query.status = statusFilter;
        }

        // Apply name search filter
        if (searchName && searchName.trim() !== '') {
            const nameRegex = new RegExp(searchName, 'i'); // Case-insensitive
            try {
                if (userRole === 'student') {
                    const psychiatrists = await User.find({ username: nameRegex, role: 'psychiatrist' });
                    console.log('Found Psychiatrists:', psychiatrists); // Debug
                    if (psychiatrists.length > 0) {
                        query.psychiatrist = { $in: psychiatrists.map(p => p._id) };
                    } else {
                        query.psychiatrist = null; // Force empty result if no matches
                    }
                } else if (userRole === 'psychiatrist') {
                    const students = await User.find({ username: nameRegex, role: 'student' });
                    console.log('Found Students:', students); // Debug
                    if (students.length > 0) {
                        query.student = { $in: students.map(s => s._id) };
                    } else {
                        query.student = null; // Force empty result if no matches
                    }
                }
            } catch (err) {
                console.error('Error searching users by name:', err);
                return res.status(500).json({ message: 'Error searching by name', error: err.message });
            }
        }

        // Fetch appointments
        console.log('Query:', query); // Debug
        let appointments;
        try {
            appointments = await Appointment.find(query)
                .populate('student', 'username email')
                .populate('psychiatrist', 'username email');
            console.log('Fetched Appointments:', appointments); // Debug
        } catch (err) {
            console.error('Error fetching appointments:', err);
            return res.status(500).json({ message: 'Error querying appointments database', error: err.message });
        }

        res.status(200).json({
            appointments,
            role: userRole,
        });
    } catch (error) {
        console.error('Error in getAppointmentHistory:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


module.exports.updateAppointmentStatus = async (req, res) => {
    try {
      const userId = req.userId; // Logged-in user's ID (from verifyToken middleware)
      const { appointmentId } = req.params; // Appointment ID to update
      const { status } = req.body; // New status
  
      const validStatuses = ['pending', 'confirmed', 'completed', 'canceled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Allowed values are: 'pending', 'confirmed', 'completed', 'canceled'.",
        });
      }
  
      const user = await User.findById(userId);
      if (!user || (user.role !== 'psychiatrist' && user.role !== 'admin')) {
        return res.status(403).json({
          message: "Only a psychiatrist or admin can update an appointment status",
        });
      }
  
      let appointment;
      if (user.role === 'psychiatrist') {
        appointment = await Appointment.findOne({ _id: appointmentId, psychiatrist: userId }).populate('student psychiatrist');
        if (!appointment) {
          return res.status(404).json({
            message: "Appointment not found or you are not authorized to modify it",
          });
        }
      } else if (user.role === 'admin') {
        appointment = await Appointment.findById(appointmentId).populate('student psychiatrist');
        if (!appointment) {
          return res.status(404).json({ message: "Appointment not found" });
        }
      }
  
      // Update the status
      appointment.status = status;
      await appointment.save();
  
      const chatCode = crypto.randomBytes(32).toString('hex'); // Generate chat code
  
      // Notify student when status changes
      if (appointment.student) {
        const studentId = appointment.student._id;
        const psychiatristName = appointment.psychiatrist.username;
        const message = `Your appointment with ${psychiatristName} has been updated to "${status}" on ${new Date(appointment.date).toLocaleDateString()} from ${appointment.startTime} to ${appointment.endTime}.`;
  
        // Store the notification
        await Notification.create({
          userId: studentId,
          message,
          type: status, // e.g., "confirmed", "canceled"
          appointmentId: appointment._id,
        });
  
        // If status is "confirmed", send email and schedule reminder
        if (status === 'confirmed') {
          const studentEmail = appointment.student.email;
          const psychiatristEmail = appointment.psychiatrist.email;
          const subject = "Your Appointment is Confirmed on EspritCare";
          const htmlContent = `
            <h2>Your Appointment is Confirmed</h2>
            <p>Hello ${appointment.student.username} and Dr. ${appointment.psychiatrist.username},</p>
            <p>The appointment has been successfully confirmed.</p>
            <ul>
              <li><strong>Date :</strong> ${new Date(appointment.date).toLocaleDateString()}</li>
              <li><strong>Time :</strong> ${appointment.startTime} - ${appointment.endTime}</li>
              <li><strong>Psychiatrist :</strong> ${appointment.psychiatrist.username}</li>
              <li><strong>Student :</strong> ${appointment.student.username}</li>
            </ul>
            <p>Please make sure to be available on time.</p>
            <p>Use this unique code to access the chat:</p>
            <h3 style="text-align: center; background-color: #0ea5e6; color: white; padding: 10px; border-radius: 5px;">
              ${chatCode}
            </h3>
            <p>Thank you for using EspritCare!</p>
          `;
  
          try {
            await Promise.all([
              sendEmail(studentEmail, subject, htmlContent),
              sendEmail(psychiatristEmail, subject, htmlContent),
            ]);
            console.log(`Emails sent to ${studentEmail} and ${psychiatristEmail} with code: ${chatCode}`);
  
            // Schedule the 5-minute reminder
            scheduleReminder(appointment, studentId);
          } catch (emailError) {
            console.error("Error sending confirmation emails:", emailError);
          }
        }
      }
  
      res.status(200).json({ message: "Appointment status updated successfully", appointment, chatCode });
    } catch (error) {
      console.error('Error in updateAppointmentStatus:', error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

  module.exports.markNotificationAsRead = async (req, res) => {
    try {
      const { notificationId } = req.params;
      const userId = req.userId;
  
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true },
        { new: true }
      );
  
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found or not authorized' });
      }
  
      res.status(200).json({ message: 'Notification marked as read', notification });
    } catch (error) {
      console.error('Error in markNotificationAsRead:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };
  
  // New endpoint to fetch notifications for a user
  module.exports.getUserNotifications = async (req, res) => {
    try {
      const userId = req.userId;
      const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
      res.status(200).json({ notifications });
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  };

// controllers/userController.js
module.exports.getPsychiatristById = async (req, res) => {
    try {
        const psychiatrist = await User.findById(req.params.id);
        if (!psychiatrist || psychiatrist.role !== 'psychiatrist') {
            return res.status(404).json({ message: 'Psychiatrist not found' });
        }
        res.status(200).json(psychiatrist);
    } catch (error) {
        console.error('Error fetching psychiatrist:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


module.exports.updateAppointment = async (req, res) => {
    try {
        const { date, startTime, endTime } = req.body;
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        if (appointment.student.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        appointment.date = date;
        appointment.startTime = startTime;
        appointment.endTime = endTime;
        await appointment.save();
        res.status(200).json(appointment);
    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports.deleteAppointment = async (req, res) => {
    try {
        const userId = req.userId; // ID de l'utilisateur connecté (from verifyToken middleware)
        const { appointmentId } = req.params; // ID du rendez-vous à supprimer

        // Vérifier si l'utilisateur est un étudiant ou un admin
        const user = await User.findById(userId);
        if (!user || (user.role !== 'student' && user.role !== 'admin')) {
            return res.status(403).json({
                message: "Seul un étudiant ou un administrateur peut supprimer un rendez-vous",
            });
        }

        // Vérifier si le rendez-vous existe
        let appointment;
        if (user.role === 'student') {
            // Les étudiants ne peuvent supprimer que leurs propres rendez-vous
            appointment = await Appointment.findOne({ _id: appointmentId, student: userId });
            if (!appointment) {
                return res.status(404).json({
                    message: "Rendez-vous non trouvé ou vous n'êtes pas autorisé à le supprimer",
                });
            }
        } else if (user.role === 'admin') {
            // Les admins peuvent supprimer n'importe quel rendez-vous
            appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return res.status(404).json({ message: "Rendez-vous non trouvé" });
            }
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


// Send a message
module.exports.sendMessage = async (req, res) => {
    try {
      const { roomCode, encryptedMessage, iv, voiceMessage, isVoice } = req.body;
      console.log('Received payload:', {
        roomCode,
        encryptedMessage,
        iv,
        voiceMessageLength: voiceMessage?.length,
        isVoice,
      });
      console.log('User ID from token:', req.userId);
  
      if (!roomCode) {
        console.log('Validation failed: roomCode missing');
        return res.status(400).json({ message: 'roomCode is required' });
      }
      if (!req.userId) {
        console.log('Validation failed: userId missing');
        return res.status(401).json({ message: 'User ID not found in token' });
      }
  
      // Validate userId as a valid ObjectId
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(req.userId)) {
        console.log('Validation failed: Invalid userId:', req.userId);
        return res.status(400).json({ message: 'Invalid user ID' });
      }
  
      if (!isVoice && (!encryptedMessage || !iv)) {
        console.log('Validation failed: encryptedMessage or iv missing for text message');
        return res.status(400).json({ message: 'encryptedMessage and iv are required for text messages' });
      }
      if (isVoice && !voiceMessage) {
        console.log('Validation failed: voiceMessage missing for voice message');
        return res.status(400).json({ message: 'voiceMessage is required for voice messages' });
      }
  
      // Add a custom size limit for voice messages (optional)
      if (isVoice && voiceMessage?.length > 10 * 1024 * 1024) { // 10MB base64 limit
        console.log('Validation failed: Voice message too large');
        return res.status(400).json({ message: 'Voice message too large. Keep it under 10MB.' });
      }
  
      console.log('Creating new Chat document...');
      const chat = new Chat({
        roomCode,
        sender: req.userId,
        encryptedMessage: isVoice ? undefined : encryptedMessage,
        iv: isVoice ? undefined : iv,
        voiceMessage: isVoice ? voiceMessage : undefined,
        isVoice: isVoice || false,
      });
  
      console.log('Saving chat document...');
      await chat.save();
      console.log('Chat document saved:', chat._id);
  
      console.log('Populating sender...');
      const populatedChat = await Chat.findById(chat._id).populate('sender', 'username user_photo');
      if (!populatedChat) {
        console.log('Population failed: Chat document not found');
        return res.status(404).json({ message: 'Chat document not found after saving' });
      }
  
      console.log('Saved message:', populatedChat);
      res.status(201).json({ message: 'Message sent successfully', data: populatedChat });
    } catch (err) {
      console.error('Error sending message:', err.stack);
      res.status(500).json({ message: 'Failed to send message', error: err.message });
    }
  };
// Fetch messages for a room
module.exports.RoomChat = async (req, res) => {
  try {
    const { roomCode } = req.params;
    if (!roomCode) {
      return res.status(400).json({ message: 'roomCode is required' });
    }

    const messages = await Chat.find({ roomCode })
      .populate('sender', 'username user_photo')
      .sort({ createdAt: 1 });
    console.log('Returning messages for roomCode:', roomCode, 'Messages:', messages);
    res.status(200).json(messages);
  } catch (err) {
    console.error('Error retrieving messages:', err);
    res.status(500).json({ message: 'Failed to retrieve messages', error: err.message });
  }
};

// Deprecated endpoints (unchanged)
module.exports.sharePublicKey = async (req, res) => {
  res.status(410).json({ message: 'Endpoint deprecated: Encryption simplified' });
};

module.exports.getPublicKeys = async (req, res) => {
  res.status(410).json({ message: 'Endpoint deprecated: Encryption simplified' });
};

  


  // Fetch room messages
  module.exports.RoomChat = async (req, res) => {
    try {
      const { roomCode } = req.params;
      const messages = await Chat.find({ roomCode })
        .populate('sender', 'username user_photo')
        .sort({ createdAt: 1 });
  
      res.status(200).json(messages);
    } catch (err) {
      console.error('Error retrieving messages:', err);
      res.status(500).json({ message: 'Failed to retrieve messages', error: err.message });
    }
  };


  
  module.exports.deletechat = async (req, res) => {
    try {
      console.log('Starting deletechat, req.userId:', req.userId);
      if (!req.userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
  
      const messageId = req.params.messageId;
      console.log('Message ID:', messageId);
  
      const message = await Chat.findById(messageId);
      if (!message) {
        return res.status(404).json({ message: 'Message not found' });
      }
  
      if (message.sender.toString() !== req.userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
  
      const deletedMessage = await Chat.findByIdAndDelete(messageId);
  
      if (!deletedMessage) {
        return res.status(404).json({ message: 'Message not found after deletion' });
      }
  
      console.log('Message deleted:', deletedMessage);
      res.status(200).json({ message: 'Message deleted', data: deletedMessage });
    } catch (err) {
      console.error('Error in deletechat:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  };


  
  
// Assuming Chat model is still Mongoose-based

module.exports.updatechat = async (req, res) => {
  try {
    console.log('Starting updatechat, req.userId:', req.userId);
    if (!req.userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const messageId = req.params.messageId;
    console.log('Message ID:', messageId);

    const { encryptedMessage, iv } = req.body;
    console.log('Request body:', { encryptedMessage, iv });
    if (!encryptedMessage || !iv) {
      return res.status(400).json({ message: 'encryptedMessage and iv are required' });
    }

    // Fetch the existing message to check ownership and type
    const message = await Chat.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (message.isVoice) {
      return res.status(400).json({ message: 'Cannot update voice messages' });
    }

    // Update the message
    const updatedMessage = await Chat.findByIdAndUpdate(
      messageId,
      { encryptedMessage, iv },
      { new: true } // Return the updated document
    );

    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found after update' });
    }

    console.log('Message updated:', updatedMessage);
    res.status(200).json({ message: 'Message updated', data: updatedMessage });
  } catch (err) {
    console.error('Error in updatechat:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
    module.exports.photo = async (req, res) => {
 
        try {
        console.log("req.userId:", req.userId); // Ajout pour debug
        const user = await User.findById(req.userId).select('username role user_photo');
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error("Erreur dans /users/me :", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
};



    module.exports.getAllchat = async (req, res) => {

    try {
      // Aggregate messages by roomCode
      const rooms = await Chat.aggregate([
        {
          $group: {
            _id: '$roomCode', // Group by roomCode
            messages: { $push: "$$ROOT" }, // Include all fields of each message
            participants: { $addToSet: '$sender' } // Collect unique sender IDs
          }
        },
        {
          $lookup: {
            from: 'users', // Your User collection name (lowercase 'users' typically)
            localField: 'participants',
            foreignField: '_id',
            as: 'participants'
          }
        },
        {
          $project: {
            roomCode: '$_id',
            _id: 0, // Exclude _id from the output
            messages: 1,
            participants: {
              $map: {
                input: '$participants',
                as: 'participant',
                in: {
                  _id: '$$participant._id',
                  username: '$$participant.username', // Adjust fields as per your User schema
                  user_photo: '$$participant.user_photo'
                }
              }
            }
          }
        }
      ]);
  
      if (!rooms || rooms.length === 0) {
        console.log('No rooms found in the database');
        return res.status(200).json([]); // Return empty array if no data
      }
  
      console.log('Returning rooms:', rooms);
      res.status(200).json(rooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      res.status(500).json({ message: 'Failed to fetch chat rooms', error: err.message });
    }
  };

    module.exports.getAllAppoint = async (req, res) => {
        try {
            const appointments = await Appointment.find()
                .populate('student', 'username email')
                .populate('psychiatrist', 'username email');
            res.json({ appointments });
        } catch (err) {
            console.error('Error fetching all appointments:', err);
            res.status(500).json({ message: 'Server error' });
        }
    };

// Create a problem
// Create a problem (unchanged)
module.exports.createProblem = async (req, res) => {
  const userId = req.userId;
  const { what, source, reaction, resolved, satisfaction, startDate, endDate, notes } = req.body;

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ message: "startDate must be before endDate" });
  }

  try {
    const problem = new Problem({
      userId,
      what,
      source,
      reaction,
      resolved: resolved || false,
      satisfaction: satisfaction || '',
      startDate: startDate || null,
      endDate: endDate || null,
      notes,
    });
    await problem.save();
    res.status(201).json({ message: 'Problem saved successfully', problem });
  } catch (error) {
    res.status(500).json({ message: 'Error saving problem', error: error.message });
  }
};

// Get problems with sorting, searching, and pagination
module.exports.getProblems = async (req, res) => {
    const { userId } = req.params;
    const { sortBy = 'createdAt', sortOrder = 'desc', search, page = 1, limit = 5 } = req.query;
  
    try {
      // Construire la requête MongoDB
      let query = { userId };
      if (search) {
        query.$or = [
          { what: { $regex: search, $options: 'i' } },
          { source: { $regex: search, $options: 'i' } },
          { reaction: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },

        ];
      }
  
      // Compter le nombre total de documents pour calculer les pages
      const totalProblems = await Problem.countDocuments(query);
      const totalPages = Math.ceil(totalProblems / limit);
  
      // Trier et paginer
      const problems = await Problem.find(query)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 }) // Tri sur tous les problèmes
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
  
      res.json({ problems, totalPages });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching problems', error });
    }
  };

// Update a problem (unchanged)
module.exports.updateProblem = async (req, res) => {
  const userId = req.userId;
  const problemId = req.params.problemId;
  const { what, source, reaction, resolved, satisfaction, startDate, endDate, notes} = req.body;

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ message: "startDate must be before endDate" });
  }

  try {
    const problem = await Problem.findOneAndUpdate(
      { _id: problemId, userId },
      {
        what,
        source,
        reaction,
        resolved,
        satisfaction,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes,
      },
      { new: true }
    );
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.status(200).json({ message: 'Problem updated successfully', problem });
  } catch (error) {
    res.status(500).json({ message: 'Error updating problem', error: error.message });
  }
};

// Delete a problem (unchanged)
module.exports.deleteProblem = async (req, res) => {
  const { userId, problemId } = req.params;

  if (req.userId !== userId) {
    return res.status(403).json({ message: 'Unauthorized access.' });
  }

  try {
    const deletedProblem = await Problem.findOneAndDelete({ _id: problemId, userId });
    if (!deletedProblem) {
      return res.status(404).json({ message: 'Problem not found.' });
    }
    res.status(200).json({ message: 'Problem deleted successfully.' });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ message: 'Error deleting problem', error: error.message });
  }
};
// Middleware pour vérifier le rôle teacher
module.exports.isTeacher = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: "Accès réservé aux enseignants" });
        }
        req.user = user; // Attach user to request object
        next();
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};

// Create an attendance sheet
module.exports.createAttendanceSheet = async (req, res) => {
    try {
        const { subject, classLevel, speciality, studentIds } = req.body;
        const teacherId = req.params.userId;

        if (!subject || !classLevel || !speciality || !studentIds) {
            return res.status(400).json({ message: "Tous les champs (subject, classLevel, speciality, studentIds) sont requis" });
        }

        const attendanceSheet = new AttendanceSheet({
            teacher: teacherId,
            subject,
            classLevel,
            speciality,
            students: studentIds.map(studentId => ({ student: studentId }))
        });

        const savedSheet = await attendanceSheet.save();

        // Associate the sheet with the teacher
        await User.findByIdAndUpdate(teacherId, {
            $push: { attendanceSheets: savedSheet._id }
        });

        res.status(201).json({ message: "Fiche de présence créée avec succès", attendanceSheet: savedSheet });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la création de la fiche", error: error.message });
    }
};

// Get all attendance sheets for a teacher
module.exports.getAttendanceSheets = async (req, res) => {
    try {
        const teacherId = req.params.userId;
        const attendanceSheets = await AttendanceSheet
            .find({ teacher: teacherId })
            .populate('students.student', 'username email');

        res.status(200).json(attendanceSheets);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des fiches", error: error.message });
    }
};

// Get a specific attendance sheet
module.exports.getAttendanceSheetById = async (req, res) => {
    try {
        const { userId, sheetId } = req.params;
        const attendanceSheet = await AttendanceSheet
            .findOne({ _id: sheetId, teacher: userId })
            .populate('students.student', 'username email');

        if (!attendanceSheet) {
            return res.status(404).json({ message: "Fiche de présence non trouvée" });
        }

        res.status(200).json(attendanceSheet);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération de la fiche", error: error.message });
    }
};

// Update attendance for a student
module.exports.updateAttendance = async (req, res) => {
    try {
        const { userId, sheetId } = req.params;
        const { studentId, present } = req.body;

        if (typeof present !== 'boolean') {
            return res.status(400).json({ message: "Le champ 'present' doit être un booléen" });
        }

        const updatedSheet = await AttendanceSheet.findOneAndUpdate(
            { _id: sheetId, teacher: userId },
            { $set: { "students.$[elem].present": present } },
            {
                arrayFilters: [{ "elem.student": studentId }],
                new: true
            }
        ).populate('students.student', 'username email');

        if (!updatedSheet) {
            return res.status(404).json({ message: "Fiche de présence non trouvée ou non autorisée" });
        }

        res.status(200).json({ message: "Présence mise à jour avec succès", attendanceSheet: updatedSheet });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la mise à jour de la présence", error: error.message });
    }
};

// Delete an attendance sheet
module.exports.deleteAttendanceSheet = async (req, res) => {
    try {
        const { userId, sheetId } = req.params;

        const deletedSheet = await AttendanceSheet.findOneAndDelete({
            _id: sheetId,
            teacher: userId
        });

        if (!deletedSheet) {
            return res.status(404).json({ message: "Fiche de présence non trouvée ou non autorisée" });
        }

        await User.findByIdAndUpdate(userId, {
            $pull: { attendanceSheets: sheetId }
        });

        res.status(200).json({ message: "Fiche de présence supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la suppression de la fiche", error: error.message });
    }
};

// Mark attendance (optional standalone function if needed elsewhere)
module.exports.markAttendance = async (req, res) => {
    try {
        const { attendanceSheetId, studentId, isPresent } = req.body;

        await AttendanceSheet.findByIdAndUpdate(attendanceSheetId, {
            $set: { "students.$[elem].present": isPresent }
        }, {
            arrayFilters: [{ "elem.student": studentId }]
        });

        res.status(200).json({ message: "Présence marquée avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors du marquage de la présence", error: error.message });
    }
};

// Participer à un événement
module.exports.participate = async (req, res) => {
    console.time("participate");
    try {
      const { eventId } = req.params;
      const userId = req.userId;
  
      console.log(`Tentative de participation de l'utilisateur ${userId} à l'événement ${eventId}`);
  
      // Validation des IDs
      if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "ID invalide" });
      }
  
      // Récupérer l'utilisateur et l'événement en parallèle
      const [user, event] = await Promise.all([
        User.findById(userId).select("role username participatedEvents"),
        Event.findById(eventId),
      ]);
  
      // Vérifications de base
      if (!user) {
        console.log(`Utilisateur ${userId} non trouvé`);
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      if (user.role !== "student") {
        console.log(`Utilisateur ${userId} n'est pas un étudiant`);
        return res.status(403).json({ message: "Seuls les étudiants peuvent participer aux événements" });
      }
      if (!event) {
        console.log(`Événement ${eventId} non trouvé`);
        return res.status(404).json({ message: "Événement non trouvé" });
      }
  
      // Vérifier le statut de l'événement
      if (event.status === "canceled" || event.status === "past") {
        console.log(`Événement ${eventId} annulé ou terminé`);
        return res.status(400).json({ message: "Impossible de participer à un événement annulé ou terminé" });
      }
  
      // Vérifier si l'utilisateur participe déjà
      if (event.participants.includes(userId)) {
        console.log(`Utilisateur ${userId} participe déjà à l'événement ${eventId}`);
        return res.status(400).json({ message: "Vous participez déjà à cet événement" });
      }
  
      // Vérifier la limite de participants
      if (event.max_participants && event.participants.length >= event.max_participants) {
        console.log(`Limite de participants atteinte pour l'événement ${eventId}`);
        return res.status(400).json({ message: "Cet événement a atteint sa limite de participants" });
      }
  
      // Ajouter l'utilisateur aux participants et l'événement aux participations
      event.participants.push(userId);
      if (!user.participatedEvents.includes(eventId)) user.participatedEvents.push(eventId);
  
      // Sauvegarder les deux documents en parallèle
      await Promise.all([event.save(), user.save()]);
  
      console.log(`✅ ${user.username} a rejoint l'événement "${event.title}". Participants: ${event.participants.length}`);
      res.status(200).json({
        message: "Participation enregistrée avec succès",
        event: event.title,
        participantsCount: event.participants.length,
      });
    } catch (error) {
      console.error("Erreur lors de la participation à l'événement:", error.stack);
      res.status(500).json({ message: "Erreur serveur interne", error: error.message });
    } finally {
      console.timeEnd("participate");
    }
  };
  
  // Vérifier la participation
  module.exports.checkParticipation = async (req, res) => {
    console.time("checkParticipation");
    try {
      const { eventId } = req.params;
      const userId = req.userId;
  
      console.log(`Vérification de la participation de ${userId} à l'événement ${eventId}`);
  
      // Validation des IDs
      if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "ID invalide" });
      }
  
      // Récupérer l'utilisateur et l'événement
      const [user, event] = await Promise.all([
        User.findById(userId).select("role participatedEvents"),
        Event.findById(eventId).select("participants"),
      ]);
  
      // Vérifications de base
      if (!user) {
        console.log(`Utilisateur ${userId} non trouvé`);
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      if (user.role !== "student") {
        console.log(`Utilisateur ${userId} n'est pas un étudiant`);
        return res.status(403).json({ message: "Seuls les étudiants peuvent vérifier leur participation" });
      }
      if (!event) {
        console.log(`Événement ${eventId} non trouvé`);
        return res.status(404).json({ message: "Événement non trouvé" });
      }
  
      // Vérifier la participation dans les deux sens pour cohérence
      const isParticipatingInEvent = event.participants.includes(userId);
      const isParticipatingInUser = user.participatedEvents.some((id) => id.toString() === eventId);
  
      // Si incohérence détectée, loguer pour investigation
      if (isParticipatingInEvent !== isParticipatingInUser) {
        console.warn(`Incohérence détectée: event.participants=${isParticipatingInEvent}, user.participatedEvents=${isParticipatingInUser}`);
      }
  
      // Priorité à event.participants comme source de vérité
      const isParticipating = isParticipatingInEvent;
      console.log(`Résultat de la vérification: ${isParticipating}`);
      res.status(200).json({ isParticipating });
    } catch (error) {
      console.error("Erreur lors de la vérification de la participation:", error.stack);
      res.status(500).json({ message: "Erreur serveur interne", error: error.message });
    } finally {
      console.timeEnd("checkParticipation");
    }
  };