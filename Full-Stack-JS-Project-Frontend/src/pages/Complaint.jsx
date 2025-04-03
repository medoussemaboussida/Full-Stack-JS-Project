import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";

function Complaint() {
  const [complaints, setComplaints] = useState([]);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [complaintToDelete, setComplaintToDelete] = useState(null);
  const [complaintToUpdate, setComplaintToUpdate] = useState(null);
  const [updatedSubject, setUpdatedSubject] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState("newest");
  const navigate = useNavigate();

  // Fonction pour basculer l'affichage du champ de recherche
  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      setSearchQuery("");
    }
  };

  // Charger le token et l'ID utilisateur
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
          return;
        }

        setToken(token);
        setUserId(decoded.id);
      } catch (error) {
        console.error("Erreur de décodage du token:", error);
        localStorage.removeItem("jwt-token");
        setToken(null);
        setUserId(null);
      }
    } else {
      console.log("Aucun token trouvé.");
      setToken(null);
      setUserId(null);
    }
  }, []);

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
        const data = await response.json();
        if (response.ok) {
          setComplaints(data);
        } else {
          console.error("Erreur lors de la récupération des réclamations:", data);
        }
      } catch (error) {
        console.error("Erreur lors de l'appel API:", error);
        toast.error("Error loading complaints.");
      }
    };

    fetchComplaints();
  }, [userId, token]);

  // Filtrer et trier les réclamations
  const filteredComplaints = complaints
    .filter((complaint) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const subjectMatch = complaint.subject.toLowerCase().includes(query);
      const descriptionMatch = complaint.description.toLowerCase().includes(query);
      const statusMatch = complaint.status.toLowerCase().includes(query);
      return subjectMatch || descriptionMatch || statusMatch;
    })
    .filter((complaint) => {
      if (sortOption === "newest" || sortOption === "oldest") return true;
      return complaint.status.toLowerCase() === sortOption;
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
      const data = await response.json();
      if (response.ok) {
        setComplaints(complaints.filter((complaint) => complaint._id !== complaintId));
        setShowDeleteModal(false);
        toast.success("Complaint deleted successfully!");
      } else {
        toast.error("Failed to delete complaint: " + data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression de la réclamation:", error);
      toast.error("Error deleting complaint!");
    }
  };

  // Mettre à jour une réclamation
  const handleUpdate = async (complaintId) => {
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
      const data = await response.json();
      if (response.ok) {
        setComplaints(
          complaints.map((complaint) =>
            complaint._id === complaintId
              ? { ...complaint, subject: updatedSubject, description: updatedDescription }
              : complaint
          )
        );
        setShowUpdateModal(false);
        toast.success("Complaint updated successfully!");
      } else {
        toast.error("Failed to update complaint: " + data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la réclamation:", error);
      toast.error("Error updating complaint!");
    }
  };

  return (
    <div>
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
        {/* Breadcrumb */}
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

        {/* Complaints Section */}
        <div className="complaint-area py-100">
          <div className="container" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className="complaint-header d-flex justify-content-between align-items-center mb-4">
              {/* Champ de recherche à gauche avec icône et animation */}
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
                        transition: "opacity 0.10s ease, width 0.10s ease",
                        visibility: isSearchOpen ? "visible" : "hidden",
                      }}
                    />
                  </>
                )}
              </div>
              {/* Conteneur pour la liste déroulante et le bouton */}
              <div className="d-flex align-items-center">
                {/* Liste déroulante à gauche */}
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

                {/* Bouton Add New Claim */}
                <button
                  className="theme-btn"
                  style={{
                    borderRadius: "50px",
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
                    }}
                  >
                    {/* Bulle de statut en haut à droite */}
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
                        margin: 0,
                      }}
                    >
                      {complaint.subject}
                    </h3>
                    <p
                      className="complaint-description mb-0"
                      style={{
                        fontSize: "18px",
                        color: "black",
                        lineHeight: "1.5",
                      }}
                    >
                      {complaint.description}
                    </p>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div className="text-muted" style={{ fontSize: "14px" }}>
                        <p style={{ margin: 0 }}>
                          Posted at: {" "}
                          {new Date(complaint.createdAt).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p style={{ margin: 0 }}>
                          Status: {complaint.status}
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
                          onClick={() => {
                            setComplaintToUpdate(complaint);
                            setUpdatedSubject(complaint.subject);
                            setUpdatedDescription(complaint.description);
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
                <p>No complaints found.</p>
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
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Confirm Deletion
            </h3>
            <p style={{ marginBottom: "20px", textAlign: "center" }}>
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
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Update Complaint
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Subject:</label>
              <input
                type="text"
                value={updatedSubject}
                onChange={(e) => setUpdatedSubject(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Description:</label>
              <textarea
                value={updatedDescription}
                onChange={(e) => setUpdatedDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "20px",
                  border: "1px solid #ddd",
                  minHeight: "100px",
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
    </div>
  );
}

export default Complaint;