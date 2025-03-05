const User = require("../model/user");

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