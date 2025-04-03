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
        const comments = await ForumComment.find({ forum_id })
        .populate("user_id", "username speciality level user_photo") // Peupler les informations de l'utilisateur qui a posté le commentaire
        .populate({
          path: "replies.user_id", // Peupler les informations de l'utilisateur qui a posté la réponse
          select: "username speciality level user_photo",
        })
        .populate({
          path: "replies.mentions", // Peupler les informations des utilisateurs mentionnés dans les réponses
          select: "username",
        });

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
  // Supprimer un signalement de commentaire
exports.deleteCommentReport = async (req, res) => {
  try {
    const reportId = req.params.reportId;

    // Vérifier si le signalement existe
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found!" });
    }

    // Vérifier si le signalement est bien lié à un commentaire
    if (!report.comment_id) {
      return res.status(400).json({ message: "This report is not associated with a comment!" });
    }

    // Supprimer le signalement
    await Report.findByIdAndDelete(reportId);

    res.status(200).json({ message: "Comment report deleted successfully!" });
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
  // Ajouter une réponse à un commentaire
module.exports.addReply = async (req, res) => {
  try {
    const { comment_id, user_id } = req.params;
    const { content, anonymous } = req.body;

    // Vérifier si le commentaire existe
    const comment = await ForumComment.findById(comment_id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extraire les mentions (@username) du contenu
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1];
      const mentionedUser = await User.findOne({ username });
      if (mentionedUser) {
        mentions.push(mentionedUser._id);
      }
    }

    // Créer la réponse
    const reply = {
      user_id,
      content,
      anonymous,
      mentions,
      createdAt: new Date(),
    };

    // Ajouter la réponse au commentaire
    comment.replies.push(reply);
    await comment.save();

    // Envoyer une notification à chaque utilisateur mentionné
    for (const mentionedUserId of mentions) {
      if (mentionedUserId.toString() !== user_id.toString()) {
        const commenterName = anonymous ? "Anonymous" : user.username;
        const message = `${commenterName} mentioned you in a reply: "${content.substring(0, 20)}..."`;
        addNotification(mentionedUserId, message, "mention");
      }
    }

    // Envoyer une notification à l'auteur du commentaire parent (s'il n'est pas l'auteur de la réponse)
    if (comment.user_id.toString() !== user_id.toString()) {
      const commenterName = anonymous ? "Anonymous" : user.username;
      const message = `${commenterName} replied to your comment: "${comment.content.substring(0, 20)}..."`;
      addNotification(comment.user_id, message, "reply");
    }

    res.status(201).json(reply);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};