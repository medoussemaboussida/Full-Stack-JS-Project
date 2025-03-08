const User = require("../model/user");
const Activity = require("../model/activity"); // Import du modèle Activity
const multer = require("multer");
const path = require("path");


// ✅ Récupérer les activités favorites d'un utilisateur
module.exports.getFavoriteActivities = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }
        res.status(200).json({ favoriteActivities: user.favoriteActivities });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
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
// ✅ Supprimer toutes les activités favorites d'un utilisateur
module.exports.clearFavoriteActivities = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        user.favoriteActivities = []; // Réinitialisation des favoris
        await user.save();

        res.status(200).json({ message: "Toutes les activités favorites ont été supprimées" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

//gestion activities
// Configuration de l'upload d'image
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Dossier où les images seront stockées
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Nom unique de l'image
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error("Seules les images JPEG, JPG, et PNG sont autorisées"));
        }
    }
}).single("image");
// ✅ Ajouter une activité (réservé aux psychiatres)
module.exports.addActivity = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const { id } = req.params; // ID du psychiatre
            const { title, description, category } = req.body;
            const imageUrl = req.file ? `/uploads/${req.file.filename}` : "default-activity.png";

            // Vérifier si l'utilisateur est un psychiatre
            const psychiatrist = await User.findById(id);
            if (!psychiatrist || psychiatrist.role !== "psychiatrist") {
                return res.status(403).json({ message: "Seuls les psychiatres peuvent ajouter des activités" });
            }

            // Vérifier si l'activité existe déjà
            const existingActivity = await Activity.findOne({ title });
            if (existingActivity) {
                return res.status(400).json({ message: "Cette activité existe déjà" });
            }

            // Vérifier si la catégorie est valide
            const validCategories = [
                "Professional and Intellectual",
                "Wellness and Relaxation",
                "Social and Relationship",
                "Physical and Sports",
                "Leisure and Cultural",
                "Consumption and Shopping",
                "Domestic and Organizational",
                "Nature and Animal-Related"
            ];
            if (!validCategories.includes(category)) {
                return res.status(400).json({ message: "Catégorie invalide" });
            }

            // Créer une nouvelle activité avec une image
            const newActivity = new Activity({ title, description, category, imageUrl, createdBy: id });
            await newActivity.save();

            res.status(201).json({ message: "Activité ajoutée avec succès", activity: newActivity });
        } catch (error) {
            res.status(500).json({ message: "Erreur serveur", error });
        }
    });
};


// ✅ Modifier une activité (réservé aux psychiatres qui l'ont créée)
module.exports.updateActivity = (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ message: err.message });
        }

        try {
            const { id, activityId } = req.params;
            const { title, description, category } = req.body;
            const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

            const psychiatrist = await User.findById(id);
            if (!psychiatrist || psychiatrist.role !== "psychiatrist") {
                return res.status(403).json({ message: "Seuls les psychiatres peuvent modifier des activités" });
            }

            const activity = await Activity.findById(activityId);
            if (!activity) {
                return res.status(404).json({ message: "Activité non trouvée" });
            }

            if (activity.createdBy.toString() !== id) {
                return res.status(403).json({ message: "Vous ne pouvez modifier que vos propres activités" });
            }

            // Mise à jour des champs
            activity.title = title || activity.title;
            activity.description = description || activity.description;
            activity.category = category || activity.category;
            if (imageUrl) activity.imageUrl = imageUrl;

            await activity.save();
            res.status(200).json({ message: "Activité mise à jour avec succès", activity });
        } catch (error) {
            res.status(500).json({ message: "Erreur serveur", error });
        }
    });
};


// ✅ Supprimer une activité (réservé aux psychiatres qui l'ont créée)
module.exports.deleteActivity = async (req, res) => {
    try {
        const { id, activityId } = req.params;

        const psychiatrist = await User.findById(id);
        if (!psychiatrist || psychiatrist.role !== "psychiatrist") {
            return res.status(403).json({ message: "Seuls les psychiatres peuvent supprimer des activités" });
        }

        const activity = await Activity.findById(activityId);
        if (!activity) {
            return res.status(404).json({ message: "Activité non trouvée" });
        }

        if (activity.createdBy.toString() !== id) {
            return res.status(403).json({ message: "Vous ne pouvez supprimer que vos propres activités" });
        }

        await Activity.findByIdAndDelete(activityId);
        res.status(200).json({ message: "Activité supprimée avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

// ✅ Récupérer toutes les activités
module.exports.getAllActivities = async (req, res) => {
    try {
        const activities = await Activity.find();
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};

// ✅ Récupérer les activités d'un psychiatre spécifique
module.exports.getPsychiatristActivities = async (req, res) => {
    try {
        const { id } = req.params;

        const psychiatrist = await User.findById(id);
        if (!psychiatrist || psychiatrist.role !== "psychiatrist") {
            return res.status(403).json({ message: "Seuls les psychiatres peuvent consulter leurs activités" });
        }

        const activities = await Activity.find({ createdBy: id });
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur", error });
    }
};