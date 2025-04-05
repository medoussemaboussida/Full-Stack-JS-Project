import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEdit, faTrashAlt, faComment } from "@fortawesome/free-solid-svg-icons";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

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

function Complaint() {
  const [complaints, setComplaints] = useState([]);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
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
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  // Fonction pour basculer l'affichage du champ de recherche
  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      setSearchQuery("");
    }
  };

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

  // Charger les réclamations de l'utilisateur
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
        setComplaints(data);
        data.forEach((complaint, index) => {
          console.log(`Description ${index + 1}:`, complaint.description);
        });
      } catch (error) {
        console.error("Erreur lors de l'appel API:", error);
      }
    };

    fetchComplaints();
  }, [userId, token]);

  // Filtrer et trier les réclamations
  const filteredComplaints = complaints
    .filter((complaint) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const subjectMatch = complaint.subject?.toLowerCase().includes(query);
      const descriptionMatch = complaint.description?.toLowerCase().includes(query);
      const statusMatch = complaint.status?.toLowerCase().includes(query);
      return subjectMatch || descriptionMatch || statusMatch;
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

  // Supprimer une réclamation
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

      const data = await response.json();
      setComplaints(complaints.filter((complaint) => complaint._id !== complaintId));
      setShowDeleteModal(false);
      toast.success("Complaint deleted successfully!");
    } catch (error) {
      console.error("Erreur lors de la suppression de la réclamation:", error);
      toast.error("Error deleting complaint. Please try again.");
    }
  };

  // Mettre à jour une réclamation
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

      const data = await response.json();
      setComplaints(
        complaints.map((complaint) =>
          complaint._id === complaintId
            ? { ...complaint, subject: updatedSubject, description: updatedDescription }
            : complaint
        )
      );
      setShowUpdateModal(false);
      toast.success("Complaint updated successfully!");
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la réclamation:", error);
      toast.error("Error updating complaint. Please try again.");
    }
  };

  // Récupérer les réponses pour une réclamation spécifique
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

  // Ouvrir le modal de conversation
  const handleOpenResponsesModal = async (complaint) => {
    const responsesData = await fetchResponses(complaint._id);
    setSelectedComplaint(complaint);
    setResponses(responsesData);
    setShowResponsesModal(true);
  };

  // Fermer le modal de conversation
  const handleCloseResponsesModal = () => {
    setShowResponsesModal(false);
    setSelectedComplaint(null);
    setResponses([]);
    setNewResponse("");
  };

  // Rafraîchir automatiquement les réponses lorsque le modal est ouvert
  useEffect(() => {
    if (!showResponsesModal || !selectedComplaint) return;

    const interval = setInterval(async () => {
      const newResponses = await fetchResponses(selectedComplaint._id);
      // Comparer les réponses pour éviter les mises à jour inutiles
      if (JSON.stringify(newResponses) !== JSON.stringify(responses)) {
        setResponses(newResponses);
      }
    }, 1000); // Rafraîchir toutes les 5 secondes

    // Nettoyer l'intervalle lorsque le modal est fermé
    return () => clearInterval(interval);
  }, [showResponsesModal, selectedComplaint, responses]);

  // Ajouter une nouvelle réponse
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
        throw new Error(`Erreur HTTP: ${response.status} - ${errorData.message || "Unknown error"}`);
      }

      const newResponseData = await response.json();
      // Formater la nouvelle réponse pour correspondre à la structure attendue
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
    <div>
      {/* Styles spécifiques pour forcer l'affichage des listes et la conversation */}
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
          <div className="container" style={{ maxWidth: "800px", margin: "0 auto" }}>
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
                          {new Date(complaint.createdAt).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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

      {/* Modal de confirmation de suppression */}
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
            <h3 style={{ marginBottom: "20px", textAlign: "center", color: "#333" }}>
              Confirm Deletion
            </h3>
            <p style={{ marginBottom: "20px", textAlign: "center", color: "666" }}>
              Are you sure you want to delete this complaint? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
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

      {/* Modal de mise à jour de la réclamation */}
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
            <h3 style={{ marginBottom: "20px", textAlign: "center", color: "#333" }}>
              Update Complaint
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black", display: "block", marginBottom: "5px" }}>
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
              <label style={{ color: "black", display: "block", marginBottom: "5px" }}>
                Description:
              </label>
              <CKEditor
                editor={ClassicEditor}
                data={updatedDescription}
                onChange={(event, editor) => {
                  const data = editor.getData();
                  setUpdatedDescription(data);
                  console.log("Updated description:", data);
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
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
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

      {/* Modal de conversation */}
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
                        {response.user_id._id === userId
                          ? "You"
                          : "Admin"}
                      </p>
                      <p>{response.content}</p>
                      <p className="timestamp">{formatMessageTime(response.createdAt)}</p>
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
    </div>
  );
}

export default Complaint;