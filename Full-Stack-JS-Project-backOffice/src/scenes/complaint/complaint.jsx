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
import ClearIcon from "@mui/icons-material/Clear"; // Icône pour "Clear discussion"
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Fonction pour parser le HTML et le convertir en JSX
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
  const [openClearModal, setOpenClearModal] = useState(false); // État pour le modal de confirmation "Clear discussion"
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [responses, setResponses] = useState([]);
  const [newResponse, setNewResponse] = useState("");
  const [adminId, setAdminId] = useState(null);
  const [adminUsername, setAdminUsername] = useState("Admin");
  const chatEndRef = useRef(null);

  // Récupérer toutes les réclamations et l'ID de l'admin
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const token = localStorage.getItem("jwt-token");
        if (!token) {
          console.error("No token found.");
          toast.error("No token found. Please log in as an admin.");
          return;
        }

        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        setAdminId(decodedToken.id);
        setAdminUsername(decodedToken.username || "Admin");

        const response = await fetch("http://localhost:5000/complaint/getComplaint", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setComplaints(data);
          setFilteredComplaints(data);
        } else {
          console.error("Erreur lors de la récupération des réclamations:", data.message);
        }
      } catch (error) {
        console.error("Erreur lors de l'appel API:", error);
      }
    };

    fetchComplaints();
  }, []);

  // Filtrer et trier les réclamations
  useEffect(() => {
    let updatedComplaints = [...complaints];

    if (searchQuery) {
      updatedComplaints = updatedComplaints.filter((complaint) => {
        const userName = complaint.user_id?.username?.toLowerCase() || "";
        const subject = complaint.subject?.toLowerCase() || "";
        const description = complaint.description?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return userName.includes(query) || subject.includes(query) || description.includes(query);
      });
    }

    if (statusFilter !== "all") {
      updatedComplaints = updatedComplaints.filter((complaint) => complaint.status === statusFilter);
    }

    updatedComplaints.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOption === "newest" ? dateB - dateA : dateA - dateB;
    });

    setFilteredComplaints(updatedComplaints);
  }, [searchQuery, sortOption, statusFilter, complaints]);

  // Supprimer une réclamation
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
        setComplaints(complaints.filter((complaint) => complaint._id !== complaintId));
        setFilteredComplaints(filteredComplaints.filter((complaint) => complaint._id !== complaintId));
        setOpenDeleteModal(false);
        toast.success("Complaint deleted successfully!");
      } else {
        console.error("Erreur lors de la suppression de la réclamation:", data.message);
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
            complaint._id === complaintId ? { ...complaint, status: newStatus } : complaint
          )
        );
        setFilteredComplaints(
          filteredComplaints.map((complaint) =>
            complaint._id === complaintId ? { ...complaint, status: newStatus } : complaint
          )
        );
        toast.success("Complaint status updated successfully!");
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
        throw new Error(`Erreur HTTP: ${response.status} - ${errorData.message || "Unknown error"}`);
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
        throw new Error(`Erreur HTTP: ${response.status} - ${errorData.message || "Unknown error"}`);
      }

      // Vider les réponses dans l'état
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
      // Comparer les réponses pour éviter les mises à jour inutiles
      if (JSON.stringify(newResponses) !== JSON.stringify(responses)) {
        setResponses(newResponses);
      }
    }, 1000); // Rafraîchir toutes les 5 secondes

    // Nettoyer l'intervalle lorsque le modal est fermé
    return () => clearInterval(interval);
  }, [openResponsesModal, selectedComplaint, responses]);

  // Ajouter une nouvelle réponse
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
        throw new Error(`Erreur HTTP: ${response.status} - ${errorData.message || "Unknown error"}`);
      }

      const newResponseData = await response.json();
      // Formater la nouvelle réponse pour correspondre à la structure attendue
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
      return messageDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
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

  return (
    <Box m="20px">
      {/* Styles spécifiques pour forcer l'affichage des listes et la conversation */}
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

      <Header
        title="COMPLAINTS MANAGEMENT"
        subtitle="List of all user complaints"
      />

      <Box display="flex" justifyContent="space-between" mb={2}>
        <TextField
          label="Search by username, subject, or description"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: "300px" }}
        />
        <Box display="flex" gap={2}>
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
                    <strong>Posted By: </strong> {complaint.user_id?.username || "Unknown"}
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
                      {complaint.user_id?.level || "N/A"} {complaint.user_id?.speciality || "N/A"}
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
                      onChange={(e) => handleUpdateStatus(complaint._id, e.target.value)}
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

      {/* Modal de confirmation de suppression de la réclamation */}
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
            Are you sure you want to delete this complaint? This action cannot be undone.
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

      {/* Modal de conversation */}
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
              <Typography variant="body2" textAlign="center" color="textSecondary">
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

      {/* Modal de confirmation pour "Clear discussion" */}
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
            Are you sure you want to clear all responses in this conversation? This action cannot be undone.
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
    </Box>
  );
};

export default AdminComplaints;