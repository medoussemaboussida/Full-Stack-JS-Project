const Association = require('../model/association');
const User = require('../model/user');
const multer = require('multer');
const path = require('path');

// // Ajouter une association
// exports.addAssociation = async (req, res) => {
//     upload(req, res, async (err) => {
//         if (err) {
//             return res.status(400).json({ message: err.message });
//         }

//         try {
//             console.log("Données reçues :", req.body);
//             console.log("Fichier reçu :", req.file);

//             const { Name_association, Description_association, contact_email_association, support_type } = req.body;

//             // Vérification des champs obligatoires
//             if (!Name_association || !Description_association || !contact_email_association || !support_type) {
//                 return res.status(400).json({ message: "Tous les champs sont obligatoires" });
//             }

//             if (!req.file) {
//                 return res.status(400).json({ message: "Le logo de l'association est requis !" });
//             }

//             // Création de l'association
//             const newAssociation = new Association({
//                 Name_association,
//                 Description_association,
//                 contact_email_association,
//                 support_type,
//                 logo_association: `/uploads/${req.file.filename}` // Stocke le chemin du fichier
//             });

//             await newAssociation.save();

//             res.status(201).json({ message: "Association ajoutée avec succès !", data: newAssociation });
//         } catch (error) {
//             console.error("Erreur lors de l'ajout de l'association :", error);
//             res.status(500).json({ message: "Erreur serveur", error: error });
//         }
        
//     });
// };

// Récupérer toutes les associations
module.exports.getAssociations = async (req, res) => {
    try {
        const associations = await Association.find()
            .populate("user_id", "username") // Récupère les infos de l'utilisateur
            .sort({ createdAt: -1 }); // Trie les associations du plus récent au plus ancien

        res.status(200).json(associations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Récupérer une association par ID
module.exports.getAssociationById = async (req, res) => {
    try {
        const { id } = req.params; // Extraire l'ID de l'association depuis les paramètres de l'URL

        const association = await Association.findById(id)
            .populate("user_id", "username"); // Récupère les informations de l'utilisateur

        if (!association) {
            return res.status(404).json({ message: "Association not found!" });
        }

        res.status(200).json(association);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Mettre à jour une association par ID
module.exports.updateAssociation = async (req, res) => {
    try {
        const { id } = req.params; // Extraire l'ID de l'association depuis les paramètres de l'URL
        const { Name_association, Description_association, contact_email_association, logo_association, support_type } = req.body;

        const association = await Association.findById(id);
        if (!association) {
            return res.status(404).json({ message: "Association not found!" });
        }

        // Mettre à jour les champs si fournis dans la requête
        if (Name_association) association.Name_association = Name_association;
        if (Description_association) association.Description_association = Description_association;
        if (contact_email_association) association.contact_email_association = contact_email_association;
        if (logo_association) association.logo_association = logo_association;
        if (support_type) association.support_type = support_type;

        const updatedAssociation = await association.save();

        res.status(200).json(updatedAssociation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Supprimer une association par ID
module.exports.deleteAssociation = async (req, res) => {
    try {
        const { id } = req.params; // Extraire l'ID de l'association depuis les paramètres de l'URL

        const association = await Association.findById(id);
        if (!association) {
            return res.status(404).json({ message: "Association not found!" });
        }

        await Association.findByIdAndDelete(id);

        res.status(200).json({ message: "Association deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// 📌 Configuration de Multer pour stocker les images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Dossier où les fichiers seront stockés
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Génération d'un nom unique
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
            cb(new Error("Seules les images JPEG, JPG et PNG sont autorisées !"));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
}).single("logo_association");






exports.addAssociation = async (req, res) => {
    console.time('addAssociation');

    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const { Name_association, Description_association, contact_email_association, support_type } = req.body;

            // Validation rapide
            if (!Name_association || !Description_association || !contact_email_association || !support_type || !req.file) {
                return res.status(400).json({ message: 'Tous les champs et le logo sont obligatoires' });
            }

            // Vérification de l'utilisateur
            const user = await User.findById(req.userId, 'role').lean();
            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }
            if (user.role !== 'association_member') {
                return res.status(403).json({ message: 'Seuls les membres associatifs peuvent ajouter une association' });
            }

            // Création de l'association
            const logoPath = `/uploads/${Date.now()}-${req.file.originalname}`;
            const newAssociation = new Association({
                Name_association,
                Description_association,
                contact_email_association,
                support_type,
                logo_association: logoPath,
                created_by: req.userId
            });

            // Tentative de sauvegarde avec gestion des erreurs de doublon
            const savedAssociation = await newAssociation.save();
            await fs.writeFile(path.join(__dirname, '..', 'uploads', `${Date.now()}-${req.file.originalname}`), req.file.buffer);

            console.timeEnd('addAssociation');
            res.status(201).json({ message: 'Association ajoutée avec succès', data: savedAssociation });
        } catch (error) {
            if (error.code === 11000 && error.keyPattern.contact_email_association) {
                return res.status(409).json({ message: `L’email ${req.body.contact_email_association} est déjà utilisé par une autre association` });
            }
            console.error('Erreur lors de l’ajout de l’association :', error);
            res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
        }
    });
};