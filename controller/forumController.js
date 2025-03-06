const User = require('../model/user');
const Forum = require('../model/forum');

//add forum topic
module.exports.addForum = async (req, res) => {
    try {
        console.log(req.body);
       

        // Récupérer les données du corps de la requête
        const { title, description,anonymous  } = req.body;
        const { user_id } = req.params;

        // Vérifier si l'utilisateur existe
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({ message: "User not found!" });
        }

        const forum_photo = req.file ? req.file.filename : null; // Si pas de fichier, forum_photo sera null

        // Créer un nouveau forum
        const forum = new Forum({ title, description, forum_photo, user_id,anonymous });

        // Sauvegarder le forum dans la base de données
        const forumAdded = await forum.save();

        // Répondre avec le forum ajouté
        res.status(201).json(forumAdded);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


//get forum topics list
module.exports.getForum = async (req, res) => {
    try {
        const forums = await Forum.find()
            .populate("user_id", "username") // Récupère les infos de l'utilisateur
            .sort({ createdAt: -1 }); // Trie les forums du plus récent au plus ancien

        // Mettez à jour chaque forum pour inclure l'URL complète de l'image
        const forumsWithImageUrl = forums.map(forum => {
            forum.forum_photo = `http://localhost:5000/uploads/${forum.forum_photo}`;
            return forum;
        });

        res.status(200).json(forumsWithImageUrl);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


//update forum 
module.exports.updateForum = async (req, res) => {
    try {
        const { forum_id } = req.params; // ID du forum à mettre à jour
        const { title, description, forum_photo } = req.body; // Champs modifiables

        // Vérifier si le forum existe
        const forum = await Forum.findById(forum_id);
        if (!forum) {
            return res.status(404).json({ message: "Forum topic not found" });
        }

        // Mettre à jour les champs si fournis
        if (title) forum.title = title;
        if (description) forum.description = description;
        if (forum_photo) forum.forum_photo = forum_photo;

        // Sauvegarder les modifications
        const updatedForum = await forum.save();

        res.status(200).json(updatedForum);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//delete forum topic
module.exports.deleteForum = async (req, res) => {
    try {
        const { forum_id } = req.params; // ID du forum à supprimer

        // Vérifier si le forum existe
        const forum = await Forum.findById(forum_id);
        if (!forum) {
            return res.status(404).json({ message: "Forum not found !" });
        }

        // Supprimer le forum
        await Forum.findByIdAndDelete(forum_id);

        res.status(200).json({ message: "Forum deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};