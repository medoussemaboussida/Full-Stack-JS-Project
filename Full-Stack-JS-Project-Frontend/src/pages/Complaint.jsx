import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faEdit,
  faTrashAlt,
  faComment,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import {
  getNotifications,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../utils/notificationUtils";

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
        return (
          <p key={index} style={{ margin: "0 0 10px 0" }}>
            {children}
          </p>
        );
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
        return (
          <li key={index} style={{ margin: "0 0 5px 0" }}>
            {children}
          </li>
        );
      case "h1":
        return (
          <h1
            key={index}
            style={{
              fontSize: "2em",
              fontWeight: "bold",
              margin: "0 0 10px 0",
            }}
          >
            {children}
          </h1>
        );
      case "h2":
        return (
          <h2
            key={index}
            style={{
              fontSize: "1.5em",
              fontWeight: "bold",
              margin: "0 0 10px 0",
            }}
          >
            {children}
          </h2>
        );
      case "h3":
        return (
          <h3
            key={index}
            style={{
              fontSize: "1.17em",
              fontWeight: "bold",
              margin: "0 0 10px 0",
            }}
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

function Complaint() {
  const [complaints, setComplaints] = useState([]);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [complaintToUpdate, setComplaintToUpdate] = useState(null);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [responses, setResponses] = useState([]);
  const [newResponse, setNewResponse] = useState("");
  const [updatedSubject, setUpdatedSubject] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState("newest");
  const [showComplaintRulesModal, setShowComplaintRulesModal] = useState(false);
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  // Charger le token, l'ID utilisateur et le nom d'utilisateur
  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          console.log("Token expiré.");
          localStorage.removeItem("jwt-token");
          setToken(null);
          setUserId(null);
          setUsername("");
          toast.error("Session expired. Please log in again.");
          navigate("/login");
          return;
        }

        setToken(token);
        setUserId(decoded.id);
        setUsername(decoded.username || "User");
      } catch (error) {
        console.error("Erreur de décodage du token:", error);
        localStorage.removeItem("jwt-token");
        setToken(null);
        setUserId(null);
        setUsername("");
        toast.error("Invalid token. Please log in again.");
        navigate("/login");
      }
    } else {
      console.log("Aucun token trouvé.");
      setToken(null);
      setUserId(null);
      setUsername("");
      toast.error("Please log in to view your complaints.");
      navigate("/login");
    }
  }, [navigate]);

  // Charger les notifications de l'utilisateur
  useEffect(() => {
    if (!userId) return;

    const loadNotifications = () => {
      const userNotifications = getNotifications(userId);
      setNotifications(userNotifications);
    };

    loadNotifications();

    const interval = setInterval(loadNotifications, 1000);
    return () => clearInterval(interval);
  }, [userId]);

  // Charger les réclamations de l'utilisateur et vérifier les suppressions et changements de statut
  useEffect(() => {
    if (!userId || !token) return;

    const fetchComplaints = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/complaint/getComplaint/${userId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Récupérer les statuts précédents depuis localStorage
        const previousStatuses = JSON.parse(
          localStorage.getItem(`complaint_statuses_${userId}`) || "{}"
        );

        // Vérifier les changements de statut
        data.forEach((complaint) => {
          const previousStatus = previousStatuses[complaint._id];
          const currentStatus = complaint.status;

          if (previousStatus && previousStatus !== currentStatus) {
            addNotification(
              userId,
              `The status of your complaint "${complaint.subject}" has changed from "${previousStatus}" to "${currentStatus}".`,
              "status_changed"
            );
          }

          previousStatuses[complaint._id] = currentStatus;
        });

        // Mettre à jour les statuts dans localStorage
        localStorage.setItem(
          `complaint_statuses_${userId}`,
          JSON.stringify(previousStatuses)
        );

        // Vérifier les suppressions
        const currentComplaintIds = complaints.map(
          (complaint) => complaint._id
        );
        const newComplaintIds = data.map((complaint) => complaint._id);
        const deletedComplaints = complaints.filter(
          (complaint) => !newComplaintIds.includes(complaint._id)
        );

        deletedComplaints.forEach((deletedComplaint) => {
          addNotification(
            userId,
            `Your complaint "${deletedComplaint.subject}" has been deleted.`,
            "complaint_deleted"
          );
        });

        setComplaints(data);
      } catch (error) {
        console.error("Erreur lors de l'appel API:", error);
      }
    };

    fetchComplaints();
    const interval = setInterval(fetchComplaints, 1000);
    return () => clearInterval(interval);
  }, [userId, token]);

  // Vérifier les nouvelles réponses pour chaque réclamation
  useEffect(() => {
    if (!userId || !token || complaints.length === 0) return;

    const fetchAllResponses = async () => {
      for (const complaint of complaints) {
        const previousResponses = JSON.parse(
          localStorage.getItem(`responses_${complaint._id}_${userId}`) || "[]"
        );

        const currentResponses = await fetchResponses(complaint._id);

        localStorage.setItem(
          `responses_${complaint._id}_${userId}`,
          JSON.stringify(currentResponses)
        );

        const newResponses = currentResponses.filter(
          (response) =>
            !previousResponses.some((prev) => prev._id === response._id) &&
            response.user_id._id !== userId
        );

        if (newResponses.length > 0) {
          newResponses.forEach((response) => {
            addNotification(
              userId,
              `A new response has been added to your complaint "${complaint.subject}" by ${response.user_id.username}.`,
              "new_response"
            );
          });
        }
      }
    };

    fetchAllResponses();
    const interval = setInterval(fetchAllResponses, 1000);
    return () => clearInterval(interval);
  }, [userId, token, complaints]);

  // Rafraîchir les réponses lorsque le modal de conversation est ouvert
  useEffect(() => {
    if (!showResponsesModal || !selectedComplaint) return;

    const interval = setInterval(async () => {
      const newResponses = await fetchResponses(selectedComplaint._id);
      if (JSON.stringify(newResponses) !== JSON.stringify(responses)) {
        setResponses(newResponses);
        localStorage.setItem(
          `responses_${selectedComplaint._id}_${userId}`,
          JSON.stringify(newResponses)
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showResponsesModal, selectedComplaint]);

  // Scroller automatiquement vers le bas du chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [responses]);

  // Calculer le nombre de notifications non lues
  const unreadNotificationsCount = notifications.filter(
    (notif) => !notif.read
  ).length;

  // Fonctions utilitaires
  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      setSearchQuery("");
    }
  };

  const handleOpenNotifications = () => {
    setShowNotificationsModal(true);
  };

  const handleMarkAsRead = (notificationId) => {
    markNotificationAsRead(userId, notificationId);
    setNotifications(getNotifications(userId));
  };

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead(userId);
    setNotifications(getNotifications(userId));
  };

  const handleDelete = async (complaintId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/complaint/deleteComplaint/${complaintId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      setComplaints(
        complaints.filter((complaint) => complaint._id !== complaintId)
      );
      setShowDeleteModal(false);
      toast.success("Complaint deleted successfully!");

      const deletedComplaint = complaints.find(
        (complaint) => complaint._id === complaintId
      );
      if (deletedComplaint) {
        addNotification(
          userId,
          `You have deleted your complaint "${deletedComplaint.subject}".`,
          "complaint_deleted"
        );
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la réclamation:", error);
      toast.error("Error deleting complaint. Please try again.");
    }
  };

  const handleUpdate = async (complaintId) => {
    if (!updatedSubject || !updatedDescription) {
      toast.error("Subject and description cannot be empty.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/complaint/updateComplaint/${complaintId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject: updatedSubject,
            description: updatedDescription,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      setComplaints(
        complaints.map((complaint) =>
          complaint._id === complaintId
            ? {
                ...complaint,
                subject: updatedSubject,
                description: updatedDescription,
              }
            : complaint
        )
      );
      setShowUpdateModal(false);
      toast.success("Complaint updated successfully!");
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la réclamation:", error);
    }
  };

  const fetchResponses = async (complaintId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/complaintResponse/getResponse/${complaintId}/${userId}`,
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

      return await response.json();
    } catch (error) {
      console.error("Erreur lors de la récupération des réponses:", error);
      return [];
    }
  };

  const handleOpenResponsesModal = async (complaint) => {
    const responsesData = await fetchResponses(complaint._id);
    setSelectedComplaint(complaint);
    setResponses(responsesData);
    setShowResponsesModal(true);

    localStorage.setItem(
      `responses_${complaint._id}_${userId}`,
      JSON.stringify(responsesData)
    );
  };

  const handleCloseResponsesModal = () => {
    setShowResponsesModal(false);
    setSelectedComplaint(null);
    setResponses([]);
    setNewResponse("");
  };

  const handleAddResponse = async () => {
    if (!newResponse.trim()) {
      toast.error("Response cannot be empty!");
      return;
    }

    if (!userId) {
      toast.error("User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/complaintResponse/addResponse/${selectedComplaint._id}/${userId}`,
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
          _id: userId,
          username: username,
        },
        createdAt: new Date().toISOString(),
      };
      setResponses([...responses, formattedResponse]);
      setNewResponse("");
      toast.success("Response added successfully!");

      localStorage.setItem(
        `responses_${selectedComplaint._id}_${userId}`,
        JSON.stringify([...responses, formattedResponse])
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi de la réponse:", error);
      toast.error(`Error adding response: ${error.message}`);
    }
  };

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

  // Filtrer et trier les réclamations
  const filteredComplaints = complaints
    .filter((complaint) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        complaint.subject?.toLowerCase().includes(query) ||
        complaint.description?.toLowerCase().includes(query) ||
        complaint.status?.toLowerCase().includes(query)
      );
    })
    .filter((complaint) => {
      if (sortOption === "newest" || sortOption === "oldest") return true;
      return complaint.status?.toLowerCase() === sortOption;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOption === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <div>
      <style jsx>{`
        .complaint-item .complaint-description.ck-editor-content ul,
        .complaint-item .complaint-description.ck-editor-content ul li {
          list-style-type: disc !important;
          padding-left: 20px !important;
          margin: 0 0 10px 0 !important;
          list-style-position: outside !important;
        }
        .complaint-item .complaint-description.ck-editor-content ol,
        .complaint-item .complaint-description.ck-editor-content ol li {
          list-style-type: decimal !important;
          padding-left: 20px !important;
          margin: 0 0 10px 0 !important;
          list-style-position: outside !important;
        }
        .complaint-item .complaint-description.ck-editor-content li {
          margin: 0 0 5px 0 !important;
          padding-left: 5px !important;
        }
        .complaint-item .complaint-description.ck-editor-content p {
          margin: 0 0 10px 0 !important;
        }
        .complaint-item .complaint-description.ck-editor-content h1 {
          font-size: 2em !important;
          font-weight: bold !important;
          margin: 0 0 10px 0 !important;
        }
        .complaint-item .complaint-description.ck-editor-content h2 {
          font-size: 1.5em !important;
          font-weight: bold !important;
          margin: 0 0 10px 0 !important;
        }
        .complaint-item .complaint-description.ck-editor-content h3 {
          font-size: 1.17em !important;
          font-weight: bold !important;
          margin: 0 0 10px 0 !important;
        }
        .ck-editor__editable ul,
        .ck-editor__editable ul li {
          list-style-type: disc !important;
          padding-left: 20px !important;
          margin: 0 0 10px 0 !important;
          list-style-position: outside !important;
        }
        .ck-editor__editable ol,
        .ck-editor__editable ol li {
          list-style-type: decimal !important;
          padding-left: 20px !important;
          margin: 0 0 10px 0 !important;
          list-style-position: outside !important;
        }
        .ck-editor__editable li {
          margin: 0 0 5px 0 !important;
          padding-left: 5px !important;
        }
        .ck-editor__editable {
          min-height: 100px !important;
          border: 1px solid #ddd !important;
          border-radius: 4px !important;
        }
        .chat-message {
          display: flex;
          margin-bottom: 15px;
        }
        .chat-message.user {
          justify-content: flex-end;
        }
        .chat-message.admin {
          justify-content: flex-start;
        }
        .chat-message .message-content {
          max-width: 70%;
          padding: 10px;
          border-radius: 15px;
          position: relative;
        }
        .chat-message.user .message-content {
          background-color: #007bff;
          color: white;
          border-bottom-right-radius: 5px;
        }
        .chat-message.admin .message-content {
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
        .chat-message.admin .message-content .timestamp {
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

      {token && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "90px",
            zIndex: 1000,
            cursor: "pointer",
          }}
          onClick={handleOpenNotifications}
        >
          <div
            style={{
              backgroundColor: "#007bff",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              transition: "transform 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.1)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <FontAwesomeIcon
              icon={faBell}
              style={{
                fontSize: "22px",
                color: "white",
              }}
            />
            {unreadNotificationsCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-5px",
                  right: "-5px",
                  backgroundColor: "red",
                  color: "white",
                  borderRadius: "50%",
                  padding: "5px 10px",
                  fontSize: "10px",
                  fontWeight: "bold",
                }}
              >
                {unreadNotificationsCount}
              </span>
            )}
          </div>
        </div>
      )}

      <main className="main">
        <div
          className="site-breadcrumb"
          style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}
        >
          <div className="container">
            <h2 className="breadcrumb-title text-white">My Complaints</h2>
            <ul className="breadcrumb-menu">
              <li>
                <a href="/Home">Home</a>
              </li>
              <li className="active">Complaints</li>
            </ul>
          </div>
        </div>

        <div className="complaint-area py-100">
          <div
            className="container"
            style={{ maxWidth: "800px", margin: "0 auto" }}
          >
            <div className="complaint-header d-flex justify-content-between align-items-center mb-4">
              <div
                style={{
                  position: "relative",
                  width: isSearchOpen ? "400px" : "40px",
                  transition: "width 0.3s ease",
                }}
              >
                {!isSearchOpen ? (
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={{
                      fontSize: "20px",
                      color: "#007bff",
                      cursor: "pointer",
                    }}
                    onClick={toggleSearch}
                  />
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={faSearch}
                      style={{
                        position: "absolute",
                        left: "15px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#007bff",
                        fontSize: "18px",
                        cursor: "pointer",
                      }}
                      onClick={toggleSearch}
                    />
                    <input
                      type="text"
                      placeholder="Search by subject, description, or status..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: "8px 8px 8px 40px",
                        borderRadius: "50px",
                        border: "1px solid #007bff",
                        outline: "none",
                        width: isSearchOpen ? "100%" : "0%",
                        boxSizing: "border-box",
                        opacity: isSearchOpen ? 1 : 0,
                        transition: "opacity 0.3s ease, width 0.3s ease",
                        visibility: isSearchOpen ? "visible" : "hidden",
                      }}
                    />
                  </>
                )}
              </div>
              <div className="d-flex align-items-center">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "50px",
                    border: "1px solid #007bff",
                    outline: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    marginRight: "10px",
                    width: "200px",
                  }}
                >
                  <option value="newest">Newest Claims</option>
                  <option value="oldest">Oldest Claims</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button
                  className="theme-btn"
                  style={{
                    borderRadius: "50px",
                    padding: "10px 20px",
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onClick={() => navigate("/addComplaint")}
                >
                  Add New Claim
                </button>
              </div>
            </div>
            <div
              style={{
                position: "fixed",
                bottom: "18px",
                left: "20px", // Positionné à gauche, comme dans le forum
                zIndex: 1000,
                cursor: "pointer",
              }}
              onClick={() => setShowComplaintRulesModal(true)}
            >
              <div
                style={{
                  backgroundColor: "#ff9800", // Orange pour se démarquer
                  borderRadius: "50%",
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                  transition: "transform 0.3s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "scale(1.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                <span style={{ fontSize: "24px", color: "white" }}>❓</span>
              </div>
            </div>
            <div
              className="complaint-list"
              style={{
                maxWidth: "800px",
                margin: "0 auto",
                width: "100%",
              }}
            >
              {filteredComplaints.length > 0 ? (
                filteredComplaints.map((complaint) => (
                  <div
                    key={complaint._id}
                    className="complaint-item p-4 border rounded mb-4"
                    style={{
                      position: "relative",
                      backgroundColor: "white",
                      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor:
                          complaint.status === "pending"
                            ? "orange"
                            : complaint.status === "resolved"
                            ? "green"
                            : "red",
                      }}
                    />
                    <h3
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                        maxWidth: "100%",
                        margin: "0 0 10px 0",
                        color: "#007bff",
                      }}
                    >
                      {complaint.subject || "No Subject"}
                    </h3>
                    <div
                      className="complaint-description mb-0 ck-editor-content"
                      style={{
                        fontSize: "16px",
                        color: "black",
                        lineHeight: "1.5",
                        padding: "10px 15px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        minHeight: "100px",
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      {parseHTMLToJSX(complaint.description)}
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div className="text-muted" style={{ fontSize: "14px" }}>
                        <p style={{ margin: 0 }}>
                          Posted at:{" "}
                          {new Date(complaint.createdAt).toLocaleString(
                            "fr-FR",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                        <p style={{ margin: "0" }}>
                          Status: {complaint.status || "Unknown"}
                        </p>
                      </div>
                      <div className="d-flex align-items-center">
                        <span
                          className="icon"
                          style={{
                            cursor: "pointer",
                            fontSize: "20px",
                            color: "#007bff",
                            marginRight: "15px",
                          }}
                          onClick={() => handleOpenResponsesModal(complaint)}
                        >
                          <FontAwesomeIcon icon={faComment} />
                        </span>
                        <span
                          className="icon"
                          style={{
                            cursor: "pointer",
                            fontSize: "20px",
                            color: "#007bff",
                            marginRight: "15px",
                          }}
                          onClick={() => {
                            setComplaintToUpdate(complaint);
                            setUpdatedSubject(complaint.subject || "");
                            setUpdatedDescription(complaint.description || "");
                            setShowUpdateModal(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </span>
                        <span
                          className="icon"
                          style={{
                            cursor: "pointer",
                            fontSize: "20px",
                            color: "red",
                          }}
                          onClick={() => {
                            setComplaintToDelete(complaint._id);
                            setShowDeleteModal(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#666" }}>
                  No complaints found.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                textAlign: "center",
                color: "#333",
              }}
            >
              Confirm Deletion
            </h3>
            <p
              style={{
                marginBottom: "20px",
                textAlign: "center",
                color: "#666",
              }}
            >
              Are you sure you want to delete this complaint? This action cannot
              be undone.
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(complaintToDelete)}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && complaintToUpdate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "500px",
              maxWidth: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3
              style={{
                marginBottom: "20px",
                textAlign: "center",
                color: "#333",
              }}
            >
              Update Complaint
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  color: "black",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Subject:
              </label>
              <input
                type="text"
                value={updatedSubject}
                onChange={(e) => setUpdatedSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label
                style={{
                  color: "black",
                  display: "block",
                  marginBottom: "5px",
                }}
              >
                Description:
              </label>
              <CKEditor
                editor={ClassicEditor}
                data={updatedDescription}
                onChange={(event, editor) => {
                  const data = editor.getData();
                  setUpdatedDescription(data);
                }}
                config={{
                  toolbar: [
                    "heading",
                    "|",
                    "bold",
                    "italic",
                    "link",
                    "bulletedList",
                    "numberedList",
                    "|",
                    "undo",
                    "redo",
                  ],
                }}
              />
            </div>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <button
                onClick={() => setShowUpdateModal(false)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdate(complaintToUpdate._id)}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {showResponsesModal && selectedComplaint && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "500px",
              maxWidth: "90%",
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ margin: 0, textAlign: "center", color: "#333" }}>
              Conversation for: {selectedComplaint.subject || "Unknown"}
            </h3>
            <div
              style={{
                flex: 1,
                maxHeight: "50vh",
                overflowY: "auto",
                padding: "10px",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
              }}
            >
              {responses.length > 0 ? (
                responses.map((response, index) => (
                  <div
                    key={index}
                    className={`chat-message ${
                      response.user_id._id === userId ? "user" : "admin"
                    }`}
                  >
                    <div className="message-content">
                      <p className="author">
                        {response.user_id._id === userId ? "You" : "Admin"}
                      </p>
                      <p>{response.content}</p>
                      <p className="timestamp">
                        {formatMessageTime(response.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#666" }}>
                  No responses yet.
                </p>
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="Type your response..."
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleAddResponse();
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                  outline: "none",
                }}
              />
              <button
                onClick={handleAddResponse}
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "50px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Send
              </button>
            </div>
            <button
              onClick={handleCloseResponsesModal}
              style={{
                backgroundColor: "#f44336",
                color: "white",
                padding: "10px 20px",
                borderRadius: "5px",
                border: "none",
                cursor: "pointer",
                alignSelf: "center",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showNotificationsModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "600px",
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Notifications
            </h3>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "10px",
              }}
            >
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  backgroundColor: "#007bff",
                  color: "white",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Mark All as Read
              </button>
            </div>
            <div
              style={{
                maxHeight: notifications.length > 3 ? "300px" : "auto",
                overflowY: notifications.length > 3 ? "auto" : "visible",
                marginBottom: "20px",
              }}
            >
              {notifications.length > 0 ? (
                notifications
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((notif) => (
                    <div
                      key={notif.id}
                      style={{
                        marginBottom: "10px",
                        padding: "10px",
                        borderBottom: "1px solid #ddd",
                        backgroundColor: notif.read ? "#f9f9f9" : "#e6f3ff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: notif.read ? "normal" : "bold",
                            color: notif.read ? "#666" : "#000",
                            fontSize: "12px",
                          }}
                        >
                          {notif.message}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#999",
                          }}
                        >
                          {new Date(notif.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                      {!notif.read && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          style={{
                            backgroundColor: "#28a745",
                            color: "white",
                            padding: "5px 10px",
                            borderRadius: "5px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  ))
              ) : (
                <p style={{ textAlign: "center" }}>
                  No notifications available.
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowNotificationsModal(false)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {showComplaintRulesModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "500px",
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Complaint Guidelines 📜
            </h3>
            <ul
              style={{
                listStyleType: "none",
                padding: 0,
                marginBottom: "20px",
                fontSize: "16px",
                color: "#333",
              }}
            >
              <li style={{ marginBottom: "10px" }}>
                <span role="img" aria-label="memo">
                  📝
                </span>{" "}
                Complaints allow you to report issues or concerns within the
                platform.
              </li>
              <li style={{ marginBottom: "10px" }}>
                <span role="img" aria-label="clock">
                  ⏰
                </span>{" "}
                An admin will review and respond to your complaint as soon as
                possible.
              </li>
              <li style={{ marginBottom: "10px" }}>
                <span role="img" aria-label="robot">
                  🤖
                </span>{" "}
                Use the chatbot Gemini to help you draft and submit a new
                complaint easily.
              </li>
              <li style={{ marginBottom: "10px" }}>
                <span role="img" aria-label="check">
                  ✅
                </span>{" "}
                Track the status of your complaint (Pending, Resolved, Rejected)
                in real-time.
              </li>
              <li>
                <span role="img" aria-label="envelope">
                  ✉️
                </span>{" "}
                You'll receive notifications when an admin responds or updates
                your complaint.
              </li>
            </ul>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setShowComplaintRulesModal(false)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Complaint;
