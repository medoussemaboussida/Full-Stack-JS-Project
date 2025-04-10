const User = require("../model/user");
const Complaint = require('../model/complaint');
const sendEmail = require('../utils/emailSender');
const ComplaintResponse = require('../model/complaintResponse');
//add reclamation
module.exports.addComplaint = async (req, res) => {
  try {
    const { subject, description } = req.body;
    const { user_id } = req.params;  // Récupère le user_id

    // Créer une nouvelle réclamation
    const newComplaint = new Complaint({
      subject,
      description,
      user_id
    });

    const savedComplaint = await newComplaint.save();

    res.status(201).json(savedComplaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//afficher tous les reclamations : pour admin dashboard
module.exports.getComplaints = async (req, res) => {
  try {
    // Récupérer toutes les réclamations
    const complaints = await Complaint.find()
      .populate('user_id', 'username email user_photo level speciality')
      .exec();

    // Si aucune réclamation n'est trouvée
    if (complaints.length === 0) {
      return res.status(404).json({ message: "No complaints found" });
    }

    // Répondre avec les réclamations et le username de chaque utilisateur
    res.status(200).json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Récupérer une réclamation spécifique par ID
module.exports.getComplaintById = async (req, res) => {
  try {
    const complaintId = req.params.complaintId;

    const complaint = await Complaint.findById(complaintId)
      .populate("user_id", "username email user_photo level speciality")
      .exec();

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.status(200).json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//afficher reclamation de user connecté
module.exports.getUserComplaints = async (req, res) => {
  try {
    const userId = req.params.user_id;

    // Vérifier si l'ID utilisateur est fourni
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Rechercher les réclamations associées à cet utilisateur
    const userComplaints = await Complaint.find({ user_id: userId });

    // Vérifier si l'utilisateur a des réclamations
    if (userComplaints.length === 0) {
      return res.status(404).json({ message: "No complaints found for this user" });
    }

    // Répondre avec la liste des réclamations de l'utilisateur
    res.status(200).json(userComplaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//modifier
module.exports.updateComplaint = async (req, res) => {
  try {
    const complaintId = req.params.complaint_id; // ID de la réclamation à mettre à jour
    const { subject, description } = req.body; // Champs à mettre à jour

    // Vérifier si la réclamation existe
    const existingComplaint = await Complaint.findById(complaintId);
    if (!existingComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Mise à jour des champs (uniquement ceux fournis dans la requête)
    if (subject) existingComplaint.subject = subject;
    if (description) existingComplaint.description = description;

    const updatedComplaint = await existingComplaint.save();

    res.status(200).json({ message: "Complaint updated successfully", complaint: updatedComplaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//suppression
module.exports.deleteComplaint = async (req, res) => {
  try {
    const complaintId = req.params.complaint_id; // ID de la réclamation à supprimer

    // Vérifier si la réclamation existe
    const existingComplaint = await Complaint.findById(complaintId);
    if (!existingComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }
    // Supprimer toutes les réponses associées à cette réclamation
    await ComplaintResponse.deleteMany({ complaint_id: complaintId });
    // Supprimer la réclamation
    await Complaint.findByIdAndDelete(complaintId);

    res.status(200).json({ message: "Complaint deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Mettre à jour le statut d'une réclamation
module.exports.updateComplaintStatus = async (req, res) => {
  try {
    const complaintId = req.params.complaint_id; // ID de la réclamation
    const { status } = req.body; // Nouveau statut

    // Vérifier si le statut est valide
    const validStatuses = ["pending", "resolved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Vérifier si la réclamation existe et récupérer les informations de l'utilisateur
    const existingComplaint = await Complaint.findById(complaintId).populate(
      "user_id",
      "username email"
    );
    if (!existingComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Mettre à jour le statut
    existingComplaint.status = status;
    const updatedComplaint = await existingComplaint.save();

    // Déterminer le message en fonction du nouveau statut
    let statusMessage;
    switch (status) {
      case "pending":
        statusMessage = "Your complaint is currently being processed.";
        break;
      case "resolved":
        statusMessage = "Your complaint has been resolved.";
        break;
      case "rejected":
        statusMessage = "Your complaint has been rejected.";
        break;
      default:
        statusMessage = "The status of your complaint has been updated.";
    }

    // Préparer le contenu de l'email en anglais avec un message dynamique
    const emailSubject = "Update on Your Complaint Status - EspritCare";
    const emailContent = `
        <h2>Hello ${existingComplaint.user_id.username},</h2>
        <p>We are writing to inform you that the status of your complaint has been updated.</p>
        <p><strong>Complaint Subject:</strong> ${existingComplaint.subject}</p>
        <p><strong>Status Update:</strong> ${statusMessage}</p>
        <p>If you have any questions, feel free to contact us through our website.</p>
        <p>Thank you for trusting EspritCare!</p>
      `;

    // Envoyer l'email à l'utilisateur
    await sendEmail(existingComplaint.user_id.email, emailSubject, emailContent);

    res.status(200).json({ message: "Complaint status updated successfully", complaint: updatedComplaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Nouvelle méthode pour récupérer les statistiques des réclamations
module.exports.getComplaintStats = async (req, res) => {
  try {
    // Compter le nombre total de réclamations
    const totalComplaints = await Complaint.countDocuments();

    // Compter les réclamations par statut
    const pendingComplaints = await Complaint.countDocuments({ status: "pending" });
    const resolvedComplaints = await Complaint.countDocuments({ status: "resolved" });
    const rejectedComplaints = await Complaint.countDocuments({ status: "rejected" });

    // Créer un objet avec les statistiques
    const stats = {
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      rejectedComplaints,
    };

    // Répondre avec les statistiques
    res.status(200).json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Nouvelle méthode pour récupérer des statistiques avancées sur les réclamations
module.exports.getAdvancedComplaintStats = async (req, res) => {
  try {
    // 1. Top utilisateur ayant soumis le plus de réclamations
    const topUser = await Complaint.aggregate([
      {
        $group: {
          _id: "$user_id", // Grouper par user_id
          complaintCount: { $sum: 1 }, // Compter le nombre de réclamations par utilisateur
        },
      },
      {
        $sort: { complaintCount: -1 }, // Trier par nombre de réclamations (décroissant)
      },
      {
        $limit: 1, // Prendre uniquement le premier (le top utilisateur)
      },
      {
        $lookup: {
          from: "users", // Collection des utilisateurs
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user", // Décomposer le tableau "user" généré par $lookup
      },
      {
        $project: {
          username: "$user.username",
          complaintCount: 1,
          _id: 0,
        },
      },
    ]);

    // 2. Nombre de réclamations par mois (sur l'année en cours, par exemple)
    const complaintsByMonth = await Complaint.aggregate([
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
        $sort: { "_id.year": 1, "_id.month": 1 }, // Trier par année et mois
      },
      {
        $project: {
          year: "$_id.year",
          month: "$_id.month",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // 3. Nombre de réclamations résolues
    const resolvedComplaints = await Complaint.countDocuments({ status: "resolved" });

    // 4. Nombre de réclamations rejetées
    const rejectedComplaints = await Complaint.countDocuments({ status: "rejected" });

    // Créer un objet avec les statistiques avancées
    const advancedStats = {
      topUser: topUser.length > 0 ? topUser[0] : { username: "N/A", complaintCount: 0 }, // Si aucun utilisateur, renvoyer un objet par défaut
      complaintsByMonth,
      resolvedComplaints,
      rejectedComplaints,
    };

    // Répondre avec les statistiques avancées
    res.status(200).json(advancedStats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};