const User = require("../model/user");
const Complaint = require('../model/complaint');

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
            .populate('user_id', 'username email') 
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

        // Supprimer la réclamation
        await Complaint.findByIdAndDelete(complaintId);

        res.status(200).json({ message: "Complaint deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};