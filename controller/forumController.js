const User = require('../model/user');
const Forum = require('../model/forum');
const Report = require("../model/ForumReport");
//add forum topic
module.exports.addForum = async (req, res) => {
    try {
        console.log(req.body);
       

        // Récupérer les données du corps de la requête
        const { title, description,anonymous, } = req.body;
        const { user_id } = req.params;

        // Vérifier si l'utilisateur existe
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({ message: "User not found!" });
        }

        const forum_photo = req.file ? req.file.filename : null; // Si pas de fichier, forum_photo sera null
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
        // Créer un nouveau forum
        const forum = new Forum({ title, description, forum_photo, user_id,anonymous ,tags});

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
            .populate("user_id", "username user_photo speciality level") // Récupère les infos de l'utilisateur
            .sort({ createdAt: -1 }); // Trie les forums du plus récent au plus ancien

            const forumsWithImageUrl = forums.map(forum => {
                if (forum.forum_photo && forum.forum_photo.trim().toLowerCase() !== "null" && forum.forum_photo.trim() !== "") {
                    forum.forum_photo = `http://localhost:5000/uploads/${forum.forum_photo}`;
                } else {
                    forum.forum_photo = null; // Définir forum_photo sur null si elle est invalide
                }
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
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);

        // Récupérer l'ID du forum à partir des paramètres
        const { forum_id } = req.params;

        // Récupérer les données du corps de la requête
        const { title, description, anonymous,tags} = req.body;

        // Vérifier si le forum existe
        const forum = await Forum.findById(forum_id);
        if (!forum) {
            return res.status(404).json({ message: "Forum topic not found" });
        }

        // Mettre à jour les champs si présents dans la requête
        if (title) forum.title = title;
        if (description) forum.description = description;
        if (anonymous !== undefined) forum.anonymous = anonymous;
        if (tags) {
            // Parser les tags (envoyés sous forme de chaîne JSON)
            const parsedTags = JSON.parse(tags);
            // Vérifier que les tags sont valides (présents dans l'enum du schéma)
            const validTags = parsedTags.filter(tag => 
                ["anxiety", "stress", "depression", "burnout", "studies", 
                 "loneliness", "motivation", "support", "insomnia", "pressure"].includes(tag)
            );
            forum.tags = validTags; // Mettre à jour les tags
        }
        // Mettre à jour la photo du forum si un fichier est envoyé
        const forum_photo = req.file ? req.file.filename : null;
        if (forum_photo) {
            forum.forum_photo = forum_photo;
        }

        // Sauvegarder les modifications dans la base de données
        const updatedForum = await forum.save();

        // Répondre avec le forum mis à jour
        res.status(200).json(updatedForum);
    } catch (err) {
        console.error('Error updating forum:', err);
        res.status(500).json({ message: 'Server error' });
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
//report forum content
exports.addReportForum = async (req, res) => {
    try {
      const { forum_id, user_id, reason } = req.body;
  
      // Vérifier si le forum existe
      const forum = await Forum.findById(forum_id);
      if (!forum) {
        return res.status(404).json({ message: "Forum not found!" });
      }
  
      // Vérifier si l'utilisateur a déjà signalé ce forum
      const existingReport = await Report.findOne({
        forum_id,
        user_id,
      });
      if (existingReport) {
        return res.status(400).json({ message: "You have already reported this forum!" });
      }
  
      // Créer un nouveau signalement
      const newReport = new Report({
        forum_id,
        user_id,
        reason,
      });
  
      const savedReport = await newReport.save();
      res.status(201).json({ message: "Forum reported successfully!", report: savedReport });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  // Récupérer les rapports d'un forum spécifique
exports.getForumReports = async (req, res) => {
    try {
      const forumId = req.params.forumId;
  
      // Vérifier si le forum existe
      const forum = await Forum.findById(forumId);
      if (!forum) {
        return res.status(404).json({ message: "Forum not found!" });
      }
  
      // Récupérer tous les rapports associés à ce forum
      const reports = await Report.find({ forum_id: forumId }).populate("user_id", "username speciality level"); // Populate pour inclure le nom d'utilisateur
  
      res.status(200).json(reports);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };