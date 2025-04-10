const Association = require('../model/association');
const User = require('../model/user');
const multer = require('multer');
const path = require('path');

// Configuration de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error("Seules les images JPEG, JPG et PNG sont autorisées !"));
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
}).single("logo_association");

// Ajouter une association
exports.addAssociation = async (req, res) => {
    console.time('addAssociation');

    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const { Name_association, Description_association, contact_email_association, support_type } = req.body;

            console.log("User ID from token:", req.userId); // Log 1
            if (!Name_association || !Description_association || !contact_email_association || !support_type || !req.file) {
                return res.status(400).json({ message: 'Tous les champs et le logo sont obligatoires' });
            }

            const user = await User.findById(req.userId, 'role').lean();
            console.log("User from DB:", user); // Log 2
            if (!user) {
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }
            if (user.role !== 'association_member') {
                console.log("Role mismatch. Found role:", user.role); // Log 3
                return res.status(403).json({ message: 'Seuls les membres associatifs peuvent ajouter une association' });
            }

            const logoPath = `/uploads/${req.file.filename}`;
            const newAssociation = new Association({
                Name_association,
                Description_association,
                contact_email_association,
                support_type,
                logo_association: logoPath,
                created_by: req.userId
            });

            const savedAssociation = await newAssociation.save();
            console.log(`✅ Association "${Name_association}" created successfully.`);

            console.timeEnd('addAssociation');
            res.status(201).json({ message: 'Association ajoutée avec succès', data: savedAssociation });
        } catch (error) {
            if (error.code === 11000 && error.keyPattern.contact_email_association) {
                return res.status(409).json({ 
                    message: `L’email ${req.body.contact_email_association} est déjà utilisé par une autre association` 
                });
            }
            console.error('Erreur lors de l’ajout de l’association :', error);
            res.status(500).json({ message: 'Erreur serveur interne', error: error.message });
        }
    });
};
// Récupérer toutes les associations (pour le back-office)
exports.getAssociations = async (req, res) => {
    try {
        const associations = await Association.find()
            .populate("user_id", "username")
            .sort({ createdAt: -1 });

        res.status(200).json(associations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Récupérer une association par ID
exports.getAssociationById = async (req, res) => {
    try {
        const { id } = req.params;
        const association = await Association.findById(id)
            .populate("user_id", "username");

        if (!association) {
            return res.status(404).json({ message: "Association not found!" });
        }

        res.status(200).json(association);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Mettre à jour une association par ID
exports.updateAssociation = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const { id } = req.params;
            const { Name_association, Description_association, contact_email_association, support_type } = req.body;

            const association = await Association.findById(id);
            if (!association) {
                return res.status(404).json({ message: "Association not found!" });
            }

            if (Name_association) association.Name_association = Name_association;
            if (Description_association) association.Description_association = Description_association;
            if (contact_email_association) association.contact_email_association = contact_email_association;
            if (support_type) association.support_type = support_type;
            if (req.file) association.logo_association = `/uploads/${req.file.filename}`;

            const updatedAssociation = await association.save();

            res.status(200).json(updatedAssociation);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });
};

// Supprimer une association par ID
exports.deleteAssociation = async (req, res) => {
    try {
        const { id } = req.params;
        const association = await Association.findById(id);
        if (!association) {
            return res.status(404).json({ message: "Association not found!" });
        }

        await Association.findByIdAndDelete(id);
        res.status(200).json({ message: "Association supprimée avec succès" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Récupérer uniquement les associations approuvées
exports.getApprovedAssociations = async (req, res) => {
    try {
        const associations = await Association.find({ isApproved: true })
            .populate("user_id", "username")
            .sort({ createdAt: -1 });
        res.status(200).json(associations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Basculer l’approbation d’une association
exports.toggleApproval = async (req, res) => {
    try {
        const { id } = req.params;
        const association = await Association.findById(id);
        if (!association) {
            return res.status(404).json({ message: "Association not found!" });
        }
        association.isApproved = !association.isApproved;
        const updatedAssociation = await association.save();
        res.status(200).json({
            message: `Association ${association.isApproved ? "approved" : "disabled"} successfully`,
            data: updatedAssociation,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
// Dans associationController.js
exports.checkAssociation = async (req, res) => {
    try {
      console.log("User ID from token:", req.userId);
      const association = await Association.findOne({ created_by: req.userId });
      res.status(200).json({ hasAssociation: !!association });
    } catch (error) {
      console.error("Erreur dans checkAssociation:", error.stack);
      res.status(500).json({ message: "Erreur lors de la vérification de l’association", error: error.message });
    }
  };

//   exports.getSupportTypeStats = async (req, res) => {
//     try {
//         console.log('1. Début de getSupportTypeStats');
//         console.log('2. Utilisateur authentifié:', req.userId);

//         console.log('3. Vérification de la connexion MongoDB...');
//         const dbStatus = mongoose.connection.readyState;
//         console.log('4. État de la connexion MongoDB:', dbStatus);

//         console.log('5. Exécution de l\'agrégation...');
//         const stats = await Association.aggregate([
//             { $group: { _id: "$support_type", count: { $sum: 1 } } },
//             { $project: { support_type: "$_id", count: 1, _id: 0 } },
//             { $sort: { count: -1 } }
//         ]);
//         console.log('6. Résultat de l\'agrégation:', stats);

//         const allSupportTypes = ["Financial", "Material", "Educational", "Other"];
//         const statsMap = stats.reduce((acc, stat) => {
//             acc[stat.support_type] = stat.count;
//             return acc;
//         }, {});
//         console.log('7. statsMap:', statsMap);

//         const completeStats = allSupportTypes.map(type => ({
//             support_type: type,
//             count: statsMap[type] || 0
//         }));
//         console.log('8. completeStats:', completeStats);

//         const totalAssociations = completeStats.reduce((sum, stat) => sum + stat.count, 0);
//         console.log('9. Total des associations:', totalAssociations);

//         res.status(200).json({
//             message: "Statistiques des types d'associations récupérées avec succès",
//             data: completeStats,
//             total: totalAssociations
//         });
//     } catch (error) {
//         console.error('Erreur détaillée dans getSupportTypeStats:', error.stack);
//         res.status(500).json({ message: "Erreur serveur interne", error: error.message });
//     }
// };