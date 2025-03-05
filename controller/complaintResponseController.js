const User = require("../model/user");
const Complaint = require('../model/complaint');
const ComplaintResponse = require('../model/complaintResponse');

//add
module.exports.addComplaintResponse = async (req, res) => {
    try {
        const { content } = req.body;
        const { complaint_id, user_id } = req.params; // Récupération des IDs depuis la route

        // Vérifier si tous les champs sont fournis
        if (!content || !complaint_id || !user_id) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Créer une nouvelle réponse à la réclamation
        const newResponse = new ComplaintResponse({
            content,
            complaint_id,
            user_id
        });

        // Enregistrer dans la base de données
        const savedResponse = await newResponse.save();

        res.status(201).json(savedResponse);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//affiche reponse de user connecte sur son reclamation
module.exports.getComplaintResponses = async (req, res) => {
    try {
        const { user_id, complaint_id } = req.params; // Récupération des paramètres de la route

        // Vérifier si l'utilisateur existe
        const userExists = await User.findById(user_id);
        if (!userExists) {
            return res.status(404).json({ message: "User not found" });
        }

        // Vérifier si la réclamation appartient bien à l'utilisateur
        const complaint = await Complaint.findOne({ _id: complaint_id, user_id: user_id });
        if (!complaint) {
            return res.status(403).json({ message: "Access denied. This complaint does not belong to you." });
        }

        // Récupérer les réponses liées à cette réclamation
        const responses = await ComplaintResponse.find({ complaint_id })
            .populate('user_id', 'username email') // Affiche l'utilisateur qui a répondu

        res.status(200).json(responses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

//affiche les reponses sur une reclamation pour admin 
module.exports.getAllResponsesForComplaint = async (req, res) => {
    try {
        const { complaint_id } = req.params; // Récupération de l'ID de la réclamation

        // Vérifier si la réclamation existe
        const complaintExists = await Complaint.findById(complaint_id);
        if (!complaintExists) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        // Récupérer toutes les réponses associées à cette réclamation
        const responses = await ComplaintResponse.find({ complaint_id })
            .populate('user_id', 'username email') // Affiche l'utilisateur qui a répondu

        res.status(200).json(responses);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};