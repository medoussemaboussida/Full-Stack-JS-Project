const User = require('../model/user');
const Forum = require('../model/forum');
const Report = require("../model/ForumReport");
const ForumBan = require("../model/ForumBan");
const ForumComment = require("../model/forumComment");
//add forum topic
module.exports.addForum = async (req, res) => {
  try {
    console.log(req.body);


    // Récupérer les données du corps de la requête
    const { title, description, anonymous,tags } = req.body;
    const { user_id } = req.params;

    // Vérifier si l'utilisateur existe
    const userExists = await User.findById(user_id);
    if (!userExists) {
      return res.status(404).json({ message: "User not found!" });
    }

    const forum_photo = req.file ? req.file.filename : null; // Si pas de fichier, forum_photo sera null
    // const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    // Créer un nouveau forum
    const forum = new Forum({ title, description, forum_photo, user_id, anonymous, tags });

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

    // Ajouter les compteurs de commentaires et signalements sans modifier la structure principale
    const forumsWithImageUrl = await Promise.all(
      forums.map(async (forum) => {
        // Compter les commentaires pour ce forum
        const commentCount = await ForumComment.countDocuments({ forum_id: forum._id });

        // Compter les signalements pour ce forum
        const reportCount = await Report.countDocuments({ forum_id: forum._id });

        // Transformer forum en objet simple pour ajouter les nouveaux champs
        const forumObj = forum.toObject();

        // Ajouter les compteurs au forum
        forumObj.commentCount = commentCount;
        forumObj.reportCount = reportCount;

        // Appliquer la logique existante pour forum_photo
        if (
          forumObj.forum_photo &&
          forumObj.forum_photo.trim().toLowerCase() !== "null" &&
          forumObj.forum_photo.trim() !== ""
        ) {
          forumObj.forum_photo = `http://localhost:5000/uploads/${forumObj.forum_photo}`;
        } else {
          forumObj.forum_photo = null; // Définir forum_photo sur null si elle est invalide
        }

        return forumObj;
      })
    );

    res.status(200).json(forumsWithImageUrl);
  } catch (err) {
    console.error("Error fetching forums:", err);
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
    const { title, description, anonymous, tags } = req.body;

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
    const { user_id } = req.body; // Récupérer l'ID de l'utilisateur qui demande la suppression (optionnel, pour vérification)

    // Vérifier si le forum existe
    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found!" });
    }

    // Optionnel : Vérifier si l'utilisateur est le créateur du forum
    if (user_id && forum.user_id.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this forum!" });
    }

    // Supprimer les commentaires associés au forum
    await ForumComment.deleteMany({ forum_id: forum_id });

    // Supprimer les signalements associés au forum
    await Report.deleteMany({ forum_id: forum_id });

    // Supprimer le forum lui-même
    await Forum.findByIdAndDelete(forum_id);

    res.status(200).json({ message: "Forum, its comments, and reports deleted successfully" });
  } catch (err) {
    console.error("Error deleting forum:", err);
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
    const reports = await Report.find({ forum_id: forumId }).populate("user_id", "username speciality level user_photo"); // Populate pour inclure le nom d'utilisateur

    res.status(200).json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//supprimer un report by moderator 
exports.deleteForumReport = async (req, res) => {
  try {
    const reportId = req.params.reportId;

    // Vérifier si le signalement existe
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found!" });
    }

    // Supprimer le signalement
    await Report.findByIdAndDelete(reportId);

    res.status(200).json({ message: "Report deleted successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//change status
exports.changeForumStatus = async (req, res) => {
  try {
    const { forum_id } = req.params;
    const { status } = req.body; // Récupérer le nouveau statut ("actif" ou "inactif")

    // Vérifier si le forum existe
    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found!" });
    }

    if (!["actif", "inactif"].includes(status)) {
      return res.status(400).json({ message: "Invalid status! Must be 'actif' or 'inactif'." });
    }
    forum.status = status;
    const updatedForum = await forum.save();

    // Répondre avec le forum mis à jour
    res.status(200).json({ message: `Forum status updated to ${status}`, forum: updatedForum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//ban from forum 
exports.banUser = async (req, res) => {
  try {
    const { user_id, duration, reason } = req.body;

    // Vérifier que tous les champs requis sont présents
    if (!user_id || !duration || !reason) {
      return res.status(400).json({
        message: "All fields are required: user_id, duration, reason",
      });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Vérifier si l'utilisateur est déjà banni
    const existingBan = await ForumBan.findOne({
      user_id,
      expiresAt: { $gt: new Date() },
    });

    if (existingBan) {
      return res.status(400).json({ message: "User is already banned" });
    }

    // Créer un nouveau bannissement
    const newBan = new ForumBan({
      user_id,
      duration,
      reason,
      bannedAt: new Date(),
    });

    // Sauvegarder le bannissement
    await newBan.save();

    res.status(201).json({
      message: `User ${user.username} has been banned for ${duration} days`,
      ban: newBan,
    });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({
      message: "Server error while banning user",
      error: error.message,
    });
  }
};

// Supprimer un ban d'utilisateur
exports.unbanUser = async (req, res) => {
  try {
    const { banId } = req.params;

    // Vérifier si le ban existe
    const ban = await ForumBan.findById(banId);
    if (!ban) {
      return res.status(404).json({ message: "Ban not found!" });
    }

    // Supprimer le ban
    await ForumBan.findByIdAndDelete(banId);

    res.status(200).json({ message: "User ban removed successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getBannedUsers = async (req, res) => {
  try {
    // Récupérer les bannissements actifs (ceux qui ne sont pas encore expirés)
    const bannedUsers = await ForumBan.find({ expiresAt: { $gt: new Date() } })
      .populate("user_id", "username email user_photo level speciality")
      .select("user_id duration reason bannedAt expiresAt");

    if (bannedUsers.length === 0) {
      return res.status(200).json({ message: "No users are currently banned", bannedUsers: [] });
    }

    res.status(200).json({
      message: "List of banned users retrieved successfully",
      bannedUsers,
    });
  } catch (error) {
    console.error("Error retrieving banned users:", error);
    res.status(500).json({ message: "Server error while retrieving banned users", error: error.message });
  }
};

exports.checkBan = async (req, res) => {
  try {
    const { userId } = req.params; // Extraire userId de req.params

    // Vérifier si l'utilisateur existe (comme dans addForum et banUser)
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Vérifier si l'utilisateur est banni
    const ban = await ForumBan.findOne({ user_id: userId });

    if (!ban) {
      return res.status(200).json({
        success: true,
        isBanned: false,
        message: "User is not banned.",
      });
    }

    const currentDate = new Date();
    const expiresAt = new Date(ban.expiresAt);

    if (expiresAt < currentDate) {
      // Le ban est expiré, on peut le supprimer
      await ForumBan.deleteOne({ _id: ban._id });
      return res.status(200).json({
        success: true,
        isBanned: false,
        message: "Ban has expired.",
      });
    }

    // L'utilisateur est banni et le ban est actif
    return res.status(200).json({
      success: true,
      isBanned: true,
      ban: {
        user_id: ban.user_id,
        reason: ban.reason,
        expiresAt: ban.expiresAt,
      },
    });
  } catch (err) {
    console.error("Error checking ban status:", err); // Log cohérent avec les autres méthodes
    res.status(500).json({ message: err.message });
  }
};
exports.getBannedUser = async (req, res) => {
  try {
    const { id } = req.params; // Extraire l'ID de req.params

    // Vérifier si l'ID est valide (format MongoDB ObjectId)
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Rechercher l'entrée de bannissement dans ForumBan
    const ban = await ForumBan.findOne({ user_id: id });

    if (!ban) {
      return res.status(404).json({
        success: false,
        message: "No ban record found for this user.",
      });
    }

    const currentDate = new Date();
    const expiresAt = new Date(ban.expiresAt);

    if (expiresAt < currentDate) {
      // Le ban est expiré, on le supprime
      await ForumBan.deleteOne({ _id: ban._id });
      return res.status(200).json({
        success: true,
        isBanned: false,
        message: "Ban has expired and has been removed.",
      });
    }

    // Le ban est actif, retourner les informations
    return res.status(200).json({
      success: true,
      isBanned: true,
      ban: {
        user_id: ban.user_id,
        username: user.username, // Ajout des informations de l'utilisateur
        user_photo: user.user_photo,
        level: user.level || "N/A",
        speciality: user.speciality || "N/A",
        reason: ban.reason,
        expiresAt: ban.expiresAt,
      },
    });
  } catch (err) {
    console.error("Error fetching banned user:", err); // Log cohérent avec les autres méthodes
    res.status(500).json({ message: err.message });
  }

};
// Méthode pour épingler ou désépingler un forum (toggle)
module.exports.togglePinForum = async (req, res) => {
  try {
    const { forum_id, user_id } = req.params; // Récupérer forum_id et user_id depuis les paramètres

    // Vérifier si l'utilisateur existe
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Vérifier si le forum existe
    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found!" });
    }

    // Vérifier si l'utilisateur a déjà épinglé le forum
    const isPinned = forum.pinned.includes(user_id);

    if (isPinned) {
      // Si déjà épinglé, retirer l'utilisateur de la liste pinned (unpin)
      forum.pinned = forum.pinned.filter((id) => id.toString() !== user_id.toString());
      const updatedForum = await forum.save();
      res.status(200).json({
        message: "Forum unpinned successfully!",
        forum: updatedForum,
      });
    } else {
      // Si pas épinglé, ajouter l'utilisateur à la liste pinned (pin)
      forum.pinned.push(user_id);
      const updatedForum = await forum.save();
      res.status(200).json({
        message: "Forum pinned successfully!",
        forum: updatedForum,
      });
    }
  } catch (err) {
    console.error("Error toggling pin status:", err);
    res.status(500).json({ message: err.message });
  }
};

//stat
exports.getForumStats = async (req, res) => {
  try {
    // Nombre de personnes ayant publié dans le forum (utilisateurs uniques)
    const uniquePublishers = await Forum.distinct("user_id").then(users => users.length);

    // Nombre total de commentaires
    const totalComments = await ForumComment.countDocuments();

    // Nombre total de signalements sur les forums
    const totalReports = await Report.countDocuments({ forum_id: { $exists: true } });

    // Nombre de bans actifs (utilisateurs bannis)
    const bannedUsers = await ForumBan.countDocuments({ expiresAt: { $gt: new Date() } });

    res.status(200).json({
      uniquePublishers,
      totalComments,
      totalReports,
      bannedUsers,
    });
  } catch (err) {
    console.error("Error fetching forum stats:", err);
    res.status(500).json({ message: err.message });
  }
};

//like and dislike
module.exports.toggleLikeForum = async (req, res) => {
  try {
    const { forum_id, user_id } = req.params;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Vérifier si le forum existe
    const forum = await Forum.findById(forum_id);
    if (!forum) {
      return res.status(404).json({ message: "Forum not found!" });
    }

    // Vérifier si l'utilisateur a déjà aimé le forum
    const isLiked = forum.likes.includes(user_id);

    if (isLiked) {
      // Si déjà aimé, retirer l'utilisateur de la liste des likes
      forum.likes = forum.likes.filter((id) => id.toString() !== user_id.toString());
      const updatedForum = await forum.save();
      res.status(200).json({
        message: "Forum unliked successfully!",
        forum: updatedForum,
      });
    } else {
      // Si pas encore aimé, ajouter l'utilisateur à la liste des likes
      forum.likes.push(user_id);
      const updatedForum = await forum.save();
      res.status(200).json({
        message: "Forum liked successfully!",
        forum: updatedForum,
      });
    }
  } catch (err) {
    console.error("Error toggling like status:", err);
    res.status(500).json({ message: err.message });
  }
};


//pdf reports stats
// Nombre de forums publiés par mois
module.exports.getMonthlyStats = async (req, res) => {
  try {
    const monthlyStats = await Forum.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 }, // Trier par année et mois décroissant
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" },
                ],
              },
            ],
          },
          count: 1,
          _id: 0,
        },
      },
    ]);

    const result = monthlyStats.reduce((acc, curr) => {
      acc[curr.month] = curr.count;
      return acc;
    }, {});

    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching monthly stats:", err);
    res.status(500).json({ message: err.message });
  }
};

// Utilisateur avec le plus de publications
module.exports.getTopPublisher = async (req, res) => {
  try {
    const topPublisher = await Forum.aggregate([
      {
        $group: {
          _id: "$user_id",
          postCount: { $sum: 1 },
        },
      },
      {
        $sort: { postCount: -1 },
      },
      {
        $limit: 1,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          username: "$user.username",
          postCount: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json(topPublisher[0] || { username: "N/A", postCount: 0 });
  } catch (err) {
    console.error("Error fetching top publisher:", err);
    res.status(500).json({ message: err.message });
  }
};
// Utilisateur le plus banni
module.exports.getMostBannedUser = async (req, res) => {
  try {
    const mostBannedUser = await ForumBan.aggregate([
      {
        $group: {
          _id: "$user_id",
          banCount: { $sum: 1 },
        },
      },
      {
        $sort: { banCount: -1 },
      },
      {
        $limit: 1,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          username: "$user.username",
          banCount: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json(mostBannedUser[0] || { username: "N/A", banCount: 0 });
  } catch (err) {
    console.error("Error fetching most banned user:", err);
    res.status(500).json({ message: err.message });
  }
};