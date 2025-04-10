import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  useTheme,
  Avatar,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Modal,
} from "@mui/material";
import { tokens } from "../../theme";
import Header from "../../components/Header";
import DeleteIcon from "@mui/icons-material/Delete";
import ChatIcon from "@mui/icons-material/Chat";
import ClearIcon from "@mui/icons-material/Clear";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  addNotification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../complaint/notificationUtils";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Fonction pour parser le HTML et le convertir en JSX (inchangée)
const parseHTMLToJSX = (htmlString) => {
  if (!htmlString || typeof htmlString !== "string") {
    return <span>Contenu non disponible</span>;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const body = doc.body;

  const convertNodeToJSX = (node, index) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const children = Array.from(node.childNodes).map((child, i) =>
      convertNodeToJSX(child, i)
    );

    switch (node.tagName.toLowerCase()) {
      case "p":
        return <p key={index} style={{ margin: "0 0 10px 0" }}>{children}</p>;
      case "ul":
        return (
          <ul
            key={index}
            style={{
              paddingLeft: "20px",
              margin: "0 0 10px 0",
              listStyleType: "disc",
            }}
          >
            {children}
          </ul>
        );
      case "ol":
        return (
          <ol
            key={index}
            style={{
              paddingLeft: "20px",
              margin: "0 0 10px 0",
              listStyleType: "decimal",
            }}
          >
            {children}
          </ol>
        );
      case "li":
        return <li key={index} style={{ margin: "0 0 5px 0" }}>{children}</li>;
      case "h1":
        return (
          <h1
            key={index}
            style={{ fontSize: "2em", fontWeight: "bold", margin: "0 0 10px 0" }}
          >
            {children}
          </h1>
        );
      case "h2":
        return (
          <h2
            key={index}
            style={{ fontSize: "1.5em", fontWeight: "bold", margin: "0 0 10px 0" }}
          >
            {children}
          </h2>
        );
      case "h3":
        return (
          <h3
            key={index}
            style={{ fontSize: "1.17em", fontWeight: "bold", margin: "0 0 10px 0" }}
          >
            {children}
          </h3>
        );
      case "strong":
      case "b":
        return <strong key={index}>{children}</strong>;
      case "em":
      case "i":
        return <em key={index}>{children}</em>;
      case "a":
        return (
          <a
            key={index}
            href={node.getAttribute("href") || "#"}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#007bff", textDecoration: "underline" }}
          >
            {children}
          </a>
        );
      default:
        return <span key={index}>{children}</span>;
    }
  };

  return Array.from(body.childNodes).map((child, index) =>
    convertNodeToJSX(child, index)
  );
};

const AdminComplaints = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openResponsesModal, setOpenResponsesModal] = useState(false);
  const [openClearModal, setOpenClearModal] = useState(false);
  const [openStatsModal, setOpenStatsModal] = useState(false);
  const [openNotificationsModal, setOpenNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [responses, setResponses] = useState([]);
  const [newResponse, setNewResponse] = useState("");
  const [adminId, setAdminId] = useState(null);
  const [adminUsername, setAdminUsername] = useState("Admin");
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    rejectedComplaints: 0,
  });
  const [advancedStats, setAdvancedStats] = useState({
    topUser: { username: "N/A", complaintCount: 0 },
    complaintsByMonth: [],
    resolvedComplaints: 0,
    rejectedComplaints: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const chatEndRef = useRef(null);
  const [processedResponseIds, setProcessedResponseIds] = useState(new Set()); // Pour suivre les réponses déjà traitées

  // Récupérer toutes les réclamations, l'ID de l'admin, les statistiques et les notifications
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("jwt-token");
        if (!token) {
          console.error("No token found.");
          toast.error("No token found. Please log in as an admin.");
          return;
        }

        let decodedToken;
        try {
          decodedToken = JSON.parse(atob(token.split(".")[1]));
        } catch (error) {
          console.error("Erreur lors du décodage du token:", error);
          toast.error("Invalid token. Please log in again.");
          return;
        }

        setAdminId(decodedToken.id);
        setAdminUsername(decodedToken.username || "Admin");

        const complaintsResponse = await fetch(
          "http://localhost:5000/complaint/getComplaint",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const complaintsData = await complaintsResponse.json();
        if (complaintsResponse.ok) {
          setComplaints(complaintsData);
          setFilteredComplaints(complaintsData);
        } else {
          console.error(
            "Erreur lors de la récupération des réclamations:",
            complaintsData.message
          );
          toast.error("Failed to load complaints: " + complaintsData.message);
        }

        const statsResponse = await fetch(
          "http://localhost:5000/complaint/stats",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const statsData = await statsResponse.json();
        if (statsResponse.ok) {
          setStats(statsData);
        } else {
          console.error(
            "Erreur lors de la récupération des statistiques:",
            statsData.message
          );
          toast.error("Failed to load stats: " + statsData.message);
        }

        const advancedStatsResponse = await fetch(
          "http://localhost:5000/complaint/advancedStats",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const advancedStatsData = await advancedStatsResponse.json();
        if (advancedStatsResponse.ok) {
          setAdvancedStats(advancedStatsData);
        } else {
          console.error(
            "Erreur lors de la récupération des statistiques avancées:",
            advancedStatsData.message
          );
          toast.error("Failed to load advanced stats: " + advancedStatsData.message);
        }

        // Charger les notifications de l'admin
        const adminNotifications = getNotifications(decodedToken.id, true);
        setNotifications(adminNotifications);
      } catch (error) {
        console.error("Erreur lors de l'appel API:", error);
        toast.error("Error loading data!");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComplaints();
  }, []); // Pas de dépendance sur adminId pour éviter des rechargements inutiles

  // Vérifier les nouvelles réponses des utilisateurs et charger les notifications
  useEffect(() => {
    if (!adminId || complaints.length === 0) return;

    const fetchAllResponsesAndNotifications = async () => {
      // Charger les notifications actuelles
      const adminNotifications = getNotifications(adminId, true);
      setNotifications(adminNotifications);

      // Vérifier les nouvelles réponses pour chaque réclamation
      for (const complaint of complaints) {
        const previousResponses = JSON.parse(
          localStorage.getItem(`admin_responses_${complaint._id}_${adminId}`) || "[]"
        );

        const currentResponses = await fetchResponses(complaint._id);

        // Mettre à jour les réponses dans localStorage
        localStorage.setItem(
          `admin_responses_${complaint._id}_${adminId}`,
          JSON.stringify(currentResponses)
        );

        // Filtrer les nouvelles réponses
        const newResponses = currentResponses.filter(
          (response) =>
            !previousResponses.some((prev) => prev._id === response._id) &&
            response.user_id._id !== adminId &&
            !processedResponseIds.has(response._id) // Vérifier si la réponse a déjà été traitée
        );

        // Ajouter les nouvelles réponses à processedResponseIds
        newResponses.forEach((response) => {
          setProcessedResponseIds((prev) => new Set(prev).add(response._id));
        });

        // Ajouter une notification pour chaque nouvelle réponse
        if (newResponses.length > 0) {
          newResponses.forEach((response) => {
            addNotification(
              adminId,
              `A new response has been added to the complaint "${complaint.subject}" by ${response.user_id.username}.`,
              "new_response",
              true
            );
          });
        }
      }
    };

    // Exécuter immédiatement au montage
    fetchAllResponsesAndNotifications();

    // Exécuter toutes les 5 secondes
    const interval = setInterval(fetchAllResponsesAndNotifications, 1000);

    return () => clearInterval(interval);
  }, [adminId, complaints]);

  // Mettre à jour les statistiques après modification
  const updateStats = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      const statsResponse = await fetch(
        "http://localhost:5000/complaint/stats",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const statsData = await statsResponse.json();
      if (statsResponse.ok) {
        setStats(statsData);
      } else {
        console.error(
          "Erreur lors de la mise à jour des statistiques:",
          statsData.message
        );
        toast.error("Failed to update stats: " + statsData.message);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des statistiques:", error);
      toast.error("Error updating stats!");
    }
  };

  // Filtrer et trier les réclamations
  useEffect(() => {
    let updatedComplaints = [...complaints];

    if (searchQuery) {
      updatedComplaints = updatedComplaints.filter((complaint) => {
        const userName = complaint.user_id?.username?.toLowerCase() || "";
        const subject = complaint.subject?.toLowerCase() || "";
        const description = complaint.description?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return (
          userName.includes(query) ||
          subject.includes(query) ||
          description.includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      updatedComplaints = updatedComplaints.filter(
        (complaint) => complaint.status === statusFilter
      );
    }

    updatedComplaints.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOption === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredComplaints(updatedComplaints);
  }, [searchQuery, sortOption, statusFilter, complaints]);

  // Supprimer une réclamation et ajouter une notification
  const handleDeleteComplaint = async (complaintId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      const response = await fetch(
        `http://localhost:5000/complaint/deleteComplaint/${complaintId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        const deletedComplaint = complaints.find(
          (complaint) => complaint._id === complaintId
        );
        if (deletedComplaint && deletedComplaint.user_id) {
          const userId = deletedComplaint.user_id._id;
          addNotification(
            userId,
            `Votre réclamation "${deletedComplaint.subject}" a été supprimée par un administrateur.`,
            "complaint_deleted"
          );
        }

        setComplaints(
          complaints.filter((complaint) => complaint._id !== complaintId)
        );
        setFilteredComplaints(
          filteredComplaints.filter(
            (complaint) => complaint._id !== complaintId
          )
        );
        setOpenDeleteModal(false);
        toast.success("Complaint deleted successfully!");
        await updateStats();
      } else {
        console.error(
          "Erreur lors de la suppression de la réclamation:",
          data.message
        );
        toast.error("Failed to delete complaint: " + data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la réclamation:", error);
      toast.error("Error deleting complaint!");
    }
  };

  // Mettre à jour le statut d'une réclamation
  const handleUpdateStatus = async (complaintId, newStatus) => {
    try {
      const token = localStorage.getItem("jwt-token");
      const response = await fetch(
        `http://localhost:5000/complaint/updateComplaintStatus/${complaintId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setComplaints(
          complaints.map((complaint) =>
            complaint._id === complaintId
              ? { ...complaint, status: newStatus }
              : complaint
          )
        );
        setFilteredComplaints(
          filteredComplaints.map((complaint) =>
            complaint._id === complaintId
              ? { ...complaint, status: newStatus }
              : complaint
          )
        );
        toast.success("Complaint status updated successfully!");
        await updateStats();
      } else {
        console.error("Erreur lors de la mise à jour du statut:", data.message);
        toast.error("Failed to update status: " + data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Error updating status!");
    }
  };

  // Récupérer les réponses pour une réclamation spécifique
  const fetchResponses = async (complaintId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      const response = await fetch(
        `http://localhost:5000/complaintResponse/getAllResponse/${complaintId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Erreur HTTP: ${response.status} - ${
            errorData.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erreur lors de la récupération des réponses:", error);
      toast.error(`Error loading responses: ${error.message}`);
      return [];
    }
  };

  // Supprimer toutes les réponses d'une réclamation
  const handleClearDiscussion = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      const response = await fetch(
        `http://localhost:5000/complaintResponse/deleteAllResponses/${selectedComplaint._id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Erreur HTTP: ${response.status} - ${
            errorData.message || "Unknown error"
          }`
        );
      }

      setResponses([]);
      setOpenClearModal(false);
      toast.success("All responses deleted successfully!");
    } catch (error) {
      console.error("Erreur lors de la suppression des réponses:", error);
      toast.error(`Error clearing discussion: ${error.message}`);
    }
  };

  // Ouvrir le modal de conversation et initialiser les réponses
  const handleOpenResponsesModal = async (complaint) => {
    const responsesData = await fetchResponses(complaint._id);
    setSelectedComplaint(complaint);
    setResponses(responsesData);
    setOpenResponsesModal(true);

    localStorage.setItem(
      `admin_responses_${complaint._id}_${adminId}`,
      JSON.stringify(responsesData)
    );
  };

  // Fermer le modal de conversation
  const handleCloseResponsesModal = () => {
    setOpenResponsesModal(false);
    setSelectedComplaint(null);
    setResponses([]);
    setNewResponse("");
  };

  // Rafraîchir automatiquement les réponses lorsque le modal est ouvert
  useEffect(() => {
    if (!openResponsesModal || !selectedComplaint) return;

    const interval = setInterval(async () => {
      const newResponses = await fetchResponses(selectedComplaint._id);
      if (JSON.stringify(newResponses) !== JSON.stringify(responses)) {
        setResponses(newResponses);
        localStorage.setItem(
          `admin_responses_${selectedComplaint._id}_${adminId}`,
          JSON.stringify(newResponses)
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [openResponsesModal, selectedComplaint, responses]);

  // Ajouter une nouvelle réponse et notifier l'utilisateur
  const handleAddResponse = async () => {
    if (!newResponse.trim()) {
      toast.error("Response cannot be empty!");
      return;
    }

    if (!adminId) {
      toast.error("Admin ID not found. Please log in again.");
      return;
    }

    try {
      const token = localStorage.getItem("jwt-token");
      const response = await fetch(
        `http://localhost:5000/complaintResponse/addResponse/${selectedComplaint._id}/${adminId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: newResponse,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Erreur HTTP: ${response.status} - ${
            errorData.message || "Unknown error"
          }`
        );
      }

      const newResponseData = await response.json();
      const formattedResponse = {
        ...newResponseData,
        user_id: {
          _id: adminId,
          username: adminUsername,
        },
        createdAt: new Date().toISOString(),
      };
      setResponses([...responses, formattedResponse]);
      setNewResponse("");
      toast.success("Response added successfully!");

      const userId = selectedComplaint.user_id._id;
      addNotification(
        userId,
        `Une nouvelle réponse a été ajoutée à votre réclamation "${selectedComplaint.subject}".`,
        "new_response"
      );

      localStorage.setItem(
        `admin_responses_${selectedComplaint._id}_${adminId}`,
        JSON.stringify([...responses, formattedResponse])
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi de la réponse:", error);
      toast.error(`Error adding response: ${error.message}`);
    }
  };

  // Scroller automatiquement vers le bas du chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [responses]);

  // Formater la date/heure
  const formatMessageTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const isToday = now.toDateString() === messageDate.toDateString();

    if (isToday) {
      return messageDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return messageDate.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // Calculer le nombre de notifications non lues
  const unreadNotificationsCount = notifications.filter((notif) => !notif.read).length;

  // Fonctions pour gérer les notifications
  const handleOpenNotifications = () => {
    setOpenNotificationsModal(true);
  };

  const handleMarkAsRead = (notificationId) => {
    markNotificationAsRead(adminId, notificationId, true);
    setNotifications(getNotifications(adminId, true));
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead(adminId, true);
    setNotifications(getNotifications(adminId, true));
  };

  // Données pour le graphique à barres
  const chartData = {
    labels: ["Complaints"],
    datasets: [
      {
        label: "Total",
        data: [stats.totalComplaints],
        backgroundColor: "#42A5F5",
        borderColor: "#1E88E5",
        borderWidth: 1,
      },
      {
        label: "Pending",
        data: [stats.pendingComplaints],
        backgroundColor: "#FFCA28",
        borderColor: "#FFB300",
        borderWidth: 1,
      },
      {
        label: "Resolved",
        data: [stats.resolvedComplaints],
        backgroundColor: "#66BB6A",
        borderColor: "#43A047",
        borderWidth: 1,
      },
      {
        label: "Rejected",
        data: [stats.rejectedComplaints],
        backgroundColor: "#EF5350",
        borderColor: "#D32F2F",
        borderWidth: 1,
      },
    ],
  };

  // Options pour le graphique
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: colors.grey[100],
        },
      },
      title: {
        display: true,
        text: "Complaint Statistics",
        color: colors.grey[100],
        font: {
          size: 18,
        },
      },
      tooltip: {
        backgroundColor: colors.grey[800],
        titleColor: colors.grey[100],
        bodyColor: colors.grey[100],
      },
    },
    scales: {
      x: {
        ticks: {
          color: colors.grey[100],
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.grey[100],
          stepSize: 1,
        },
        grid: {
          color: colors.grey[700],
        },
      },
    },
  };

  // Fonction pour générer le PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    console.log("generatePDF appelé");

    try {
      const logo = "../../assets/logo.png";
      const imgWidth = 40;
      const imgHeight = 10;
      doc.addImage(logo, "PNG", 160, 13, imgWidth, imgHeight);

      doc.setFontSize(18);
      doc.text("Complaint Report", 14, 20);

      doc.setFontSize(14);
      doc.text("Réclamations per month", 14, 30);
      const monthlyData = advancedStats.complaintsByMonth.map((item) => [
        `${item.month}/${item.year}`,
        item.count,
      ]);
      autoTable(doc, {
        startY: 35,
        head: [["Month/year", "number of Complaints"]],
        body: monthlyData,
      });

      let currentY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Complaints statistics", 14, currentY);
      const statsData = [
        ["Total", stats.totalComplaints],
        ["Pending", stats.pendingComplaints],
        ["Resolved", stats.resolvedComplaints],
        ["Rejected", stats.rejectedComplaints],
      ];
      autoTable(doc, {
        startY: currentY + 5,
        head: [["Statut", "Number"]],
        body: statsData,
      });

      currentY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Top Users", 14, currentY);
      const topUserData = [
        [
          advancedStats.topUser.username,
          advancedStats.topUser.complaintCount,
        ],
      ];
      autoTable(doc, {
        startY: currentY + 5,
        head: [["User", "number of Complaints"]],
        body: topUserData,
      });

      currentY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("list of Complaints", 14, currentY);
      const complaintData = complaints.map((complaint) => [
        complaint.user_id?.username || "Unknown",
        complaint.subject,
        complaint.description.substring(0, 50) + "...",
        complaint.status,
        new Date(complaint.createdAt).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      ]);
      autoTable(doc, {
        startY: currentY + 5,
        head: [["User", "Sujet", "Description", "Statut", "Date of creation"]],
        body: complaintData,
      });

      doc.save(`rapport_reclamations_${new Date().toLocaleDateString("fr-FR")}.pdf`);
    } catch (error) {
      console.error("Erreur dans generatePDF:", error);
      toast.error("Erreur lors de la génération du PDF !");
    }
  };

  if (isLoading) {
    return (
      <Box
        m="20px"
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <Typography variant="h5">Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box m="20px">
      <style jsx>{`
        .complaint-description.ck-editor-content ul,
        .complaint-description.ck-editor-content ul li {
          list-style-type: disc !important;
          padding-left: 20px !important;
          margin: 0 0 10px 0 !important;
          list-style-position: outside !important;
        }
        .complaint-description.ck-editor-content ol,
        .complaint-description.ck-editor-content ol li {
          list-style-type: decimal !important;
          padding-left: 20px !important;
          margin: 0 0 10px 0 !important;
          list-style-position: outside !important;
        }
        .complaint-description.ck-editor-content li {
          margin: 0 0 5px 0 !important;
          padding-left: 5px !important;
        }
        .complaint-description.ck-editor-content p {
          margin: 0 0 10px 0 !important;
        }
        .complaint-description.ck-editor-content h1 {
          font-size: 2em !important;
          font-weight: bold !important;
          margin: 0 0 10px 0 !important;
        }
        .complaint-description.ck-editor-content h2 {
          font-size: 1.5em !important;
          font-weight: bold !important;
          margin: 0 0 10px 0 !important;
        }
        .complaint-description.ck-editor-content h3 {
          font-size: 1.17em !important;
          font-weight: bold !important;
          margin: 0 0 10px 0 !important;
        }
        .chat-message {
          display: flex;
          margin-bottom: 15px;
        }
        .chat-message.admin {
          justify-content: flex-end;
        }
        .chat-message.user {
          justify-content: flex-start;
        }
        .chat-message .message-content {
          max-width: 70%;
          padding: 10px;
          border-radius: 15px;
          position: relative;
        }
        .chat-message.admin .message-content {
          background-color: #0084ff;
          color: white;
          border-bottom-right-radius: 5px;
        }
        .chat-message.user .message-content {
          background-color: #e5e5ea;
          color: black;
          border-bottom-left-radius: 5px;
        }
        .chat-message .message-content p {
          margin: 0;
        }
        .chat-message .message-content .author {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .chat-message .message-content .timestamp {
          font-size: 10px;
          margin-top: 5px;
          color: #d0e7ff;
          text-align: right;
        }
        .chat-message.user .message-content .timestamp {
          color: #666;
          text-align: left;
        }
      `}</style>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* Bulle de notification flottante */}
      <Box
        sx={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 1000,
          cursor: "pointer",
        }}
        onClick={handleOpenNotifications}
      >
        <Box
          sx={{
            backgroundColor: colors.blueAccent[500],
            borderRadius: "50%",
            width: "60px",
            height: "60px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            transition: "transform 0.3s ease",
            "&:hover": {
              transform: "scale(1.1)",
            },
          }}
        >
          <NotificationsIcon sx={{ fontSize: "24px", color: "white" }} />
          {unreadNotificationsCount > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                backgroundColor: "red",
                color: "white",
                borderRadius: "50%",
                padding: "5px 8px",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {unreadNotificationsCount}
            </Box>
          )}
        </Box>
      </Box>

      <Header
        title="COMPLAINTS MANAGEMENT"
        subtitle="List of all user complaints"
      />

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          label="Search by username, subject, or description"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px" }}
        />
        <Button
          variant="contained"
          color="warning"
          onClick={() => setOpenStatsModal(true)}
        >
          View Stats
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={generatePDF}
        >
          Download Report
        </Button>
        <Box display="flex" gap={2} ml="auto">
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box mt={4}>
        {filteredComplaints.length > 0 ? (
          filteredComplaints.map((complaint, index) => (
            <Box
              key={index}
              bgcolor={colors.primary[400]}
              p={2}
              borderRadius={2}
              mb={2}
              boxShadow={3}
            >
              <Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar
                    src={
                      complaint.user_id?.user_photo
                        ? `http://localhost:5000${complaint.user_id.user_photo}`
                        : "/assets/default_user.png"
                    }
                    alt="User Avatar"
                    sx={{ width: 30, height: 30 }}
                  />
                  <Typography variant="h5">
                    <strong>Posted By: </strong>{" "}
                    {complaint.user_id?.username || "Unknown"}
                    <span
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #00BFFF",
                        color: "#00BFFF",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)",
                        fontSize: "0.875rem",
                        marginLeft: "8px",
                      }}
                    >
                      {complaint.user_id?.level || "N/A"}{" "}
                      {complaint.user_id?.speciality || "N/A"}
                    </span>
                  </Typography>
                </Box>
                <br />
                <Typography variant="h6">
                  <strong>Subject: </strong> {complaint.subject}
                </Typography>
                <Box
                  mt={1}
                  p={1}
                  bgcolor={colors.blueAccent[700]}
                  borderRadius={1}
                  sx={{ maxHeight: 100, overflowY: "auto" }}
                  className="complaint-description ck-editor-content"
                >
                  <Typography variant="body1">
                    <strong>Description: </strong>
                    {parseHTMLToJSX(complaint.description)}
                  </Typography>
                </Box>
                <Typography variant="caption" color="textSecondary">
                  Posted at:{" "}
                  {new Date(complaint.createdAt).toLocaleString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
                <br />
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography
                    variant="body2"
                    color={
                      complaint.status === "pending"
                        ? "orange"
                        : complaint.status === "resolved"
                        ? "green"
                        : "red"
                    }
                  >
                    <strong>Status: </strong>
                  </Typography>
                  <FormControl sx={{ minWidth: 120 }}>
                    <Select
                      value={complaint.status}
                      onChange={(e) =>
                        handleUpdateStatus(complaint._id, e.target.value)
                      }
                      sx={{
                        height: "30px",
                        color:
                          complaint.status === "pending"
                            ? "orange"
                            : complaint.status === "resolved"
                            ? "green"
                            : "red",
                      }}
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="resolved">Resolved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <br />
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="medium"
                    startIcon={<ChatIcon />}
                    onClick={() => handleOpenResponsesModal(complaint)}
                  >
                    View Conversation
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="medium"
                    startIcon={<DeleteIcon />}
                    onClick={() => {
                      setComplaintToDelete(complaint._id);
                      setOpenDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </Box>
              </Box>
            </Box>
          ))
        ) : (
          <Typography variant="body1" textAlign="center">
            No complaints found.
          </Typography>
        )}
      </Box>

      <Modal open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "40%",
            maxHeight: "80%",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" mb={2} color="white">
            Confirm Deletion
          </Typography>
          <Typography variant="body1" mb={2} color="white">
            Are you sure you want to delete this complaint? This action cannot
            be undone.
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleDeleteComplaint(complaintToDelete)}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={openResponsesModal} onClose={handleCloseResponsesModal}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: colors.primary[400],
            padding: "20px",
            borderRadius: "8px",
            width: "500px",
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            boxShadow: 24,
          }}
        >
          <Typography variant="h5" textAlign="center">
            Conversation for: {selectedComplaint?.subject || "Unknown"}
          </Typography>
          <Box
            sx={{
              flex: 1,
              maxHeight: "50vh",
              overflowY: "auto",
              padding: "10px",
              backgroundColor: colors.grey[900],
              borderRadius: "4px",
            }}
          >
            {responses.length > 0 ? (
              responses.map((response, index) => (
                <Box
                  key={index}
                  className={`chat-message ${
                    response.user_id._id === adminId ? "admin" : "user"
                  }`}
                >
                  <Box className="message-content">
                    <Typography className="author" variant="caption">
                      {response.user_id._id === adminId
                        ? "You"
                        : response.user_id.username || "User"}
                    </Typography>
                    <Typography variant="body2">{response.content}</Typography>
                    <Typography className="timestamp" variant="caption">
                      {formatMessageTime(response.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              ))
            ) : (
              <Typography
                variant="body2"
                textAlign="center"
                color="textSecondary"
              >
                No responses yet.
              </Typography>
            )}
            <div ref={chatEndRef} />
          </Box>
          <Box display="flex" gap={2}>
            <TextField
              label="Type your response..."
              variant="outlined"
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAddResponse();
              }}
              fullWidth
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleAddResponse}
            >
              Send
            </Button>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Button
              variant="contained"
              color="warning"
              startIcon={<ClearIcon />}
              onClick={() => setOpenClearModal(true)}
            >
              Clear discussion
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleCloseResponsesModal}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={openClearModal} onClose={() => setOpenClearModal(false)}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "black",
            padding: "20px",
            borderRadius: "8px",
            width: "40%",
            maxHeight: "80%",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" mb={2} color="white">
            Confirm Clear Discussion
          </Typography>
          <Typography variant="body1" mb={2} color="white">
            Are you sure you want to clear all responses in this conversation?
            This action cannot be undone.
          </Typography>
          <Box display="flex" justifyContent="center" gap={2}>
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenClearModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleClearDiscussion}
            >
              Clear
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={openStatsModal} onClose={() => setOpenStatsModal(false)}>
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: colors.primary[400],
            padding: "20px",
            borderRadius: "8px",
            width: "600px",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            boxShadow: 24,
          }}
        >
          <Typography variant="h5" textAlign="center">
            Complaint Statistics
          </Typography>

          <Box display="flex" justifyContent="space-around" mb={2}>
            <Box textAlign="center">
              <Typography variant="h6" color="#42A5F5">
                Total: {stats.totalComplaints}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" color="#FFCA28">
                Pending: {stats.pendingComplaints}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" color="#66BB6A">
                Resolved: {stats.resolvedComplaints}
              </Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" color="#EF5350">
                Rejected: {stats.rejectedComplaints}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ height: "400px" }}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
          <Box display="flex" justifyContent="center">
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenStatsModal(false)}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Modal pour les notifications */}
      <Modal
        open={openNotificationsModal}
        onClose={() => setOpenNotificationsModal(false)}
      >
        <Box
          sx={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: colors.primary[400],
            padding: "20px",
            borderRadius: "8px",
            width: "600px",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            gap: "15px",
            boxShadow: 24,
          }}
        >
          <Typography variant="h5" textAlign="center">
            Notifications
          </Typography>
          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              onClick={handleMarkAllAsRead}
              size="small"
            >
              Mark All as Read
            </Button>
          </Box>
          <Box
            sx={{
              maxHeight: notifications.length > 3 ? "300px" : "auto",
              overflowY: notifications.length > 3 ? "auto" : "visible",
              mb: 2,
            }}
          >
            {notifications.length > 0 ? (
              notifications
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((notif) => (
                  <Box
                    key={notif.id}
                    sx={{
                      mb: 1,
                      p: 1,
                      borderBottom: `1px solid ${colors.grey[700]}`,
                      backgroundColor: notif.read ? colors.grey[800] : colors.blueAccent[700],
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: notif.read ? "normal" : "bold",
                          color: notif.read ? colors.grey[300] : colors.grey[100],
                        }}
                      >
                        {notif.message}
                      </Typography>
                      <Typography variant="caption" color={colors.grey[500]}>
                        {new Date(notif.createdAt).toLocaleString("fr-FR")}
                      </Typography>
                    </Box>
                    {!notif.read && (
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleMarkAsRead(notif.id)}
                      >
                        Mark as Read
                      </Button>
                    )}
                  </Box>
                ))
            ) : (
              <Typography variant="body2" textAlign="center">
                No notifications available.
              </Typography>
            )}
          </Box>
          <Box display="flex" justifyContent="center">
            <Button
              variant="contained"
              color="error"
              onClick={() => setOpenNotificationsModal(false)}
            >
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default AdminComplaints;