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
const storage1 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/activities/');
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
}).single('image');  // ✅ Maintenant ça correspond au frontend


// ✅ Ajouter une activité (réservé aux psychiatres)
module.exports.addActivity = (req, res) => {
    console.log("🟢 Requête reçue pour ajouter une activité", req.body);

    upload1(req, res, async (err) => {  // ✅ Utilise bien "upload1"
        if (err) {
            console.error("❌ Erreur de téléchargement:", err);
            return res.status(400).json({ message: err.message });
        }

        try {
            console.log("📌 Données reçues:", req.body);
            console.log("📸 Fichier image:", req.file);

            const { id } = req.params; // ID du psychiatre
            const { title, description, category } = req.body;
            const imageUrl = req.file ? `/uploads/activities/${req.file.filename}` : "default-activity.png";

            // Vérifier si l'utilisateur est un psychiatre
            const psychiatrist = await User.findById(id);
            if (!psychiatrist || psychiatrist.role !== "psychiatrist") {
                console.error("❌ Non autorisé: utilisateur n'est pas un psychiatre");
                return res.status(403).json({ message: "Only psychiatrists can add activities" });
            }

            // Vérifier si l'activité existe déjà
            const existingActivity = await Activity.findOne({ title });
            if (existingActivity) {
                console.error("❌ Cette activité existe déjà");
                return res.status(400).json({ message: "This activity already exists" });
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
                console.error("❌ Catégorie invalide:", category);
                return res.status(400).json({ message: "Invalid category" });
            }

            // Créer une nouvelle activité
            const newActivity = new Activity({ title, description, category, imageUrl, createdBy: id });
            await newActivity.save();
            console.log("✅ Activité ajoutée avec succès:", newActivity);

            res.status(201).json({ message: "Activity added successfully", activity: newActivity });
        } catch (error) {
            console.error("❌ Erreur serveur:", error);
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
            const imageUrl = req.file ? `/uploads/activities/${req.file.filename}` : null;

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

        /*if (activity.createdBy.toString() !== id) {
            return res.status(403).json({ message: "Vous ne pouvez supprimer que vos propres activités" });
        }*/

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

// ✅ Filtrer les activités par catégorie
module.exports.getActivitiesByCategory = async (req, res) => {
    try {
        const { category } = req.query;

        if (!category) {
            return res.status(400).json({ message: "La catégorie est requise." });
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
            return res.status(400).json({ message: "Catégorie invalide." });
        }

        // Filtrer les activités
        const activities = await Activity.find({ category });

        res.status(200).json(activities);
    } catch (error) {
        console.error("❌ Erreur serveur:", error);
        res.status(500).json({ message: "Erreur serveur", error });
    }
};
