const ForumComment = require("../model/forumComment");
const Forum = require("../model/forum");
const User = require("../model/user");
const Report = require("../model/ForumReport");

//add a comment for forum topic
module.exports.addComment = async (req, res) => {
    try {
        const { content,anonymous} = req.body; 
        const { user_id, forum_id} = req.params; // Récupération des IDs à partir des paramètres d'URL

        // Vérifier si le forum existe
        const forum = await Forum.findById(forum_id);
        if (!forum) {
            return res.status(404).json({ message: "Forum topic not found" });
        }

        // Vérifier si l'utilisateur existe
        const user = await User.findById(user_id);
        if (!user) {
            return res.status(404).json({ message: "User not foun" });
        }

        const newComment = new ForumComment({
            content,
            user_id,
            forum_id,
            anonymous
        });

        // Sauvegarder le commentaire
        const savedComment = await newComment.save();

        res.status(201).json(savedComment); 
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//affichage des commentaires d'un forum topic : 
module.exports.getComments = async (req, res) => {
    try {
        const { forum_id } = req.params; // Récupération du forum_id 

        // Vérifier si le forum existe
        const forum = await Forum.findById(forum_id);
        if (!forum) {
            return res.status(404).json({ message: "Forum not found !" });
        }

        // Récupérer tous les commentaires du forum
        const comments = await ForumComment.find({ forum_id }).populate("user_id", "username speciality level user_photo"); // Peupler les informations de l'utilisateur (username, speciality, level, user_photo)


        // Retourner les commentaires
        res.status(200).json(comments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//update 
module.exports.updateComment = async (req, res) => {
    try {
        const { comment_id } = req.params; // Récupération du comment_id 
        const { content } = req.body; // Le nouveau contenu du commentaire

        // Vérifier si le commentaire existe
        const comment = await ForumComment.findById(comment_id);
        if (!comment) {
            return res.status(404).json({ message: "Comment not foud !" });
        }

        // Mettre à jour le contenu du commentaire
        comment.content = content;

        // Sauvegarder les modifications
        const updatedComment = await comment.save();

        res.status(200).json(updatedComment); // Renvoie le commentaire mis à jour
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//delete
module.exports.deleteComment = async (req, res) => {
    try {
        const { comment_id } = req.params; // Récupérer l'ID du commentaire 

        // Chercher et supprimer le commentaire par son ID
        const deletedComment = await ForumComment.findByIdAndDelete(comment_id);

        // Vérifier si le commentaire a bien été trouvé et supprimé
        if (!deletedComment) {
            return res.status(404).json({ message: "Comment not found !" });
        }

        res.status(200).json({ message: "Comment deleted successfully" }); 
    } catch (err) {
        res.status(500).json({ message: err.message }); 
    }
};
// Ajouter un signalement pour un commentaire
exports.addReportComment = async (req, res) => {
    try {
      const { comment_id, user_id, reason } = req.body;
  
      // Vérifier si le commentaire existe
      const comment = await ForumComment.findById(comment_id);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found!" });
      }
  
      // Vérifier si l'utilisateur a déjà signalé ce commentaire
      const existingReport = await Report.findOne({
        comment_id,
        user_id,
      });
      if (existingReport) {
        return res.status(400).json({ message: "You have already reported this comment!" });
      }
  
      // Créer un nouveau signalement
      const newReport = new Report({
        comment_id,
        user_id,
        reason,
      });
  
      const savedReport = await newReport.save();
      res.status(201).json({ message: "Comment reported successfully!", report: savedReport });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  // Récupérer les signalements d'un commentaire spécifique
exports.getCommentReports = async (req, res) => {
    try {
      const commentId = req.params.commentId;
  
      // Vérifier si le commentaire existe
      const comment = await ForumComment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found!" });
      }
  
      // Récupérer tous les signalements associés à ce commentaire
      const reports = await Report.find({ comment_id: commentId }).populate("user_id", "username speciality level user_photo");
  
      res.status(200).json(reports);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  //like comment
  exports.toggleLikeComment = async (req, res) => {
    try {
      const { comment_id, user_id } = req.params;
  
      const comment = await ForumComment.findById(comment_id);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found!" });
      }
  
      const user = await User.findById(user_id);
      if (!user) {
        return res.status(404).json({ message: "User not found!" });
      }
  
      const userIdStr = user_id.toString();
      const hasLiked = comment.likes.some((id) => id.toString() === userIdStr);
  
      if (hasLiked) {
        // Retirer le like
        comment.likes = comment.likes.filter((id) => id.toString() !== userIdStr);
      } else {
        // Ajouter le like
        comment.likes.push(user_id);
      }
  
      const updatedComment = await comment.save();
      res.status(200).json({ comment: updatedComment });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  //pdf report
  module.exports.getTopCommenter = async (req, res) => {
    try {
      const topCommenter = await ForumComment.aggregate([
        {
          $group: {
            _id: "$user_id",
            commentCount: { $sum: 1 },
          },
        },
        {
          $sort: { commentCount: -1 },
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
            commentCount: 1,
            _id: 0,
          },
        },
      ]);
  
      res.status(200).json(topCommenter[0] || { username: "N/A", commentCount: 0 });
    } catch (err) {
      console.error("Error fetching top commenter:", err);
      res.status(500).json({ message: err.message });
    }
  };