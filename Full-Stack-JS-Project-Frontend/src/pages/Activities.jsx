import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart as faHeartSolid } from "@fortawesome/free-solid-svg-icons"; // Filled heart
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons"; // Empty heart
import { faTrash } from "@fortawesome/free-solid-svg-icons"; // Trash icon for removing
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons"; // Chevron icons for pagination
import { faPlus } from "@fortawesome/free-solid-svg-icons"; // Plus icon for Add Activity

// Fonction pour supprimer les balises HTML
const stripHtmlTags = (html) => {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || "";
};

function Activities() {
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("*");
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [favoriteActivities, setFavoriteActivities] = useState([]); // Track user's favorite activity IDs
  const [showFavoriteList, setShowFavoriteList] = useState(false); // State to toggle favorite list visibility
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showRemoveFavoriteModal, setShowRemoveFavoriteModal] = useState(false); // State for remove favorite modal
  const [activityToRemove, setActivityToRemove] = useState(null); // Track the activity to remove
  const [showClearAllFavoriteModal, setShowClearAllFavoriteModal] = useState(false); // State for clear all favorite modal
  const [currentPage, setCurrentPage] = useState(1); // State for current page
  const itemsPerPage = 8; // Maximum activities per page

  const navigate = useNavigate();

  // Liste des catégories stylées
  const categories = [
    { label: "All", value: "*" },
    { label: "Professional and Intellectual", value: "Professional and Intellectual" },
    { label: "Wellness and Relaxation", value: "Wellness and Relaxation" },
    { label: "Social and Relationship", value: "Social and Relationship" },
    { label: "Physical and Sports", value: "Physical and Sports" },
    { label: "Leisure and Cultural", value: "Leisure and Cultural" },
    { label: "Consumption and Shopping", value: "Consumption and Shopping" },
    { label: "Domestic and Organizational", value: "Domestic and Organizational" },
    { label: "Nature and Animal-Related", value: "Nature and Animal-Related" },
  ];

  // Récupérer les activités
  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/users/list/activities");
      const data = await response.json();
      if (response.ok) {
        setActivities(data);
      } else {
        console.error("Failed to fetch activities:", data.message);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Récupérer les activités favorites de l'utilisateur
  const fetchFavoriteActivities = async (userId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) return;

      const response = await fetch(`http://localhost:5000/users/favorite-activities/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setFavoriteActivities(data.favoriteActivities || []);
      } else {
        console.error("Failed to fetch favorite activities:", data.message);
      }
    } catch (error) {
      console.error("Error fetching favorite activities:", error);
    }
  };

  // Basculer l'état favori d'une activité
  const toggleFavoriteActivity = async (activityId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        toast.error("You must be logged in!");
        return;
      }

      const response = await fetch(`http://localhost:5000/users/favorite-activity/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activity: activityId }),
      });

      const data = await response.json();
      if (response.ok) {
        const isFavorite = favoriteActivities.includes(activityId);
        setFavoriteActivities((prev) =>
          isFavorite
            ? prev.filter((id) => id !== activityId)
            : [...prev, activityId]
        );
        toast.success(`Activity ${isFavorite ? "removed from" : "added to"} favorites!`);
      } else {
        toast.error(`Failed to toggle favorite: ${data.message}`);
      }
    } catch (error) {
      console.error("Error toggling favorite activity:", error);
      toast.error("An error occurred while toggling the favorite.");
    }
  };

  // Supprimer toutes les activités favorites
  const clearFavoriteActivities = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !userId) {
        toast.error("You must be logged in!");
        return;
      }

      const response = await fetch(`http://localhost:5000/users/clear-favorite/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (response.ok) {
        setFavoriteActivities([]); // Clear local state
        toast.success("All favorite activities have been cleared!");
      } else {
        toast.error(`Failed to clear favorites: ${data.message}`);
      }
    } catch (error) {
      console.error("Error clearing favorite activities:", error);
      toast.error("An error occurred while clearing favorites.");
    }
  };

  // Update activity
  const handleEdit = (activity) => {
    navigate(`/edit-activity/${activity._id}`, { state: { imageUrl: activity.imageUrl } });
  };

  // Supprimer une activité
  const handleDelete = (activityId) => {
    setActivityToDelete(activityId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (activityId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        toast.error("You must be logged in!");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/users/psychiatrist/${userId}/delete-activity/${activityId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setActivities(activities.filter((activity) => activity._id !== activityId));
        toast.success("Activity deleted successfully!");
      } else {
        toast.error(`Failed to delete activity: ${data.message}`);
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("An error occurred while deleting the activity.");
    }
    closeDeleteModal();
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setActivityToDelete(null);
  };

  // Afficher le modal pour une activité
  const handleViewActivityModal = (activity) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  // Fermer le modal
  const closeViewActivityModal = () => {
    setShowModal(false);
    setSelectedActivity(null);
  };

  // Afficher le modal de confirmation pour retirer une activité des favoris
  const handleRemoveFavorite = (activityId) => {
    setActivityToRemove(activityId);
    setShowRemoveFavoriteModal(true);
  };

  const handleConfirmRemoveFavorite = async () => {
    if (activityToRemove) {
      await toggleFavoriteActivity(activityToRemove);
    }
    closeRemoveFavoriteModal();
  };

  const closeRemoveFavoriteModal = () => {
    setShowRemoveFavoriteModal(false);
    setActivityToRemove(null);
  };

  // Afficher le modal de confirmation pour vider tous les favoris
  const handleClearAllFavorites = () => {
    setShowClearAllFavoriteModal(true);
  };

  const handleConfirmClearAllFavorites = async () => {
    await clearFavoriteActivities();
    closeClearAllFavoriteModal();
  };

  const closeClearAllFavoriteModal = () => {
    setShowClearAllFavoriteModal(false);
  };

  // Filtrer par catégorie
  const fetchActivitiesByCategory = async (category) => {
    setIsLoading(true);
    setCurrentPage(1); // Reset to first page when changing category
    if (category === "*") {
      fetchActivities();
      return;
    }
    try {
      const response = await fetch(
        `http://localhost:5000/users/activities/category?category=${encodeURIComponent(category)}`
      );
      const data = await response.json();
      if (response.ok) {
        setActivities(data);
      } else {
        console.error("Erreur:", data.message);
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle favorite list visibility
  const toggleFavoriteList = () => {
    setShowFavoriteList(!showFavoriteList);
    if (!showFavoriteList) {
      fetchFavoriteActivities(userId); // Refresh favorite list when opening
    }
  };

  // Handle Add Activity
  const handleAddActivity = () => {
    navigate("/add-activity");
  };

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.id) setUserId(decoded.id);
        if (decoded.role) setUserRole(decoded.role);
        fetchFavoriteActivities(decoded.id); // Fetch favorites when user is logged in
      } catch (error) {
        console.error("Invalid token:", error);
      }
    }
    fetchActivities();
  }, []);

  useEffect(() => {
    fetchActivitiesByCategory(selectedCategory);
  }, [selectedCategory]);

  
  // Pagination logic
  const totalActivities = activities.length;
  const totalPages = Math.ceil(totalActivities / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = activities.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to top on page change
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return <div style={{ textAlign: "center", padding: "20px", fontSize: "18px" }}>Loading...</div>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div
        className="site-breadcrumb"
        style={{
          background: "url(assets/img/breadcrumb/01.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "60px 0",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">Activities</h2>
          <ul
            className="breadcrumb-menu"
            style={{
              display: "flex",
              justifyContent: "center",
              listStyle: "none",
              padding: "0",
              marginTop: "10px",
            }}
          >
            <li style={{ marginRight: "10px" }}>
              <a href="/Home" style={{ color: "#fff", textDecoration: "none", fontWeight: "bold" }}>
                Home
              </a>
            </li>
            <li style={{ color: "#ff5a5f", textDecoration: "none", fontWeight: "bold" }}>
              Activities
            </li>
          </ul>
        </div>
      </div>

      {/* Bouton My Favorite Activities */}
      {userRole === "student" && (
        <div style={{ textAlign: "center", margin: "20px 0" }}>
          <button
            onClick={toggleFavoriteList}
            style={{
              backgroundColor: "#0ea5e6",
              color: "white",
              padding: "10px 20px",
              borderRadius: "5px",
              fontWeight: "bold",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
          >
            My Favorite Activities
          </button>
        </div>
      )}

      {/* Liste des activités favorites */}
      {showFavoriteList && userRole === "student" && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#fff",
            borderRadius: "15px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            margin: "0 auto 40px",
            maxWidth: "1200px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "#333" }}>
              My Favorite Activities
            </h3>
            {favoriteActivities.length > 0 && (
              <button
                onClick={handleClearAllFavorites}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  border: "none",
                  cursor: "pointer",
                  transition: "background-color 0.3s ease",
                }}
                onMouseEnter={(e) => (e.target.style.backgroundColor = "#d32f2f")}
                onMouseLeave={(e) => (e.target.style.backgroundColor = "#f44336")}
              >
                Clear All Favorites
              </button>
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "30px",
            }}
          >
            {activities
              .filter((activity) => favoriteActivities.includes(activity._id))
              .map((activity, index) => (
                <div
                  key={index}
                  style={{
                    background: "#fff",
                    borderRadius: "15px",
                    overflow: "hidden",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                    transition: "transform 0.3s ease",
                    position: "relative",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-10px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <img
                    src={
                      activity.imageUrl
                        ? `http://localhost:5000${activity.imageUrl}`
                        : "/assets/img/activities/default.png"
                    }
                    alt="Favorite Activity"
                    style={{ width: "100%", height: "250px", objectFit: "cover" }}
                    onClick={() => handleViewActivityModal(activity)}
                  />
                  <div style={{ padding: "20px" }}>
                    <h4>{stripHtmlTags(activity.title)}</h4>
                    <p>{stripHtmlTags(activity.description)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFavorite(activity._id)}
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      background: "rgba(0, 0, 0, 0.5)",
                      border: "none",
                      borderRadius: "50%",
                      padding: "5px",
                      cursor: "pointer",
                      color: "#fff",
                      fontSize: "16px",
                      transition: "background 0.3s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "rgba(244, 67, 54, 0.8)")}
                    onMouseLeave={(e) => (e.target.style.background = "rgba(0, 0, 0, 0.5)")}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              ))}
          </div>
          {activities.filter((activity) => favoriteActivities.includes(activity._id)).length === 0 && (
            <p style={{ textAlign: "center", color: "#666" }}>No favorite activities yet.</p>
          )}
        </div>
      )}

      {/* Liste des activités avec pagination */}
      <div style={{ padding: "40px", backgroundColor: "#f9f9f9", textAlign: "center" }}>
        <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "20px" }}>
          Choose your <span style={{ color: "#ff5a5f" }}>favorite activities</span> & add them to your{" "}
          <span style={{ color: "#ff5a5f" }}>daily routine.</span>
        </h2>

        {/* Add Activity Button */}
        {userRole === "psychiatrist" && (
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <button
              onClick={handleAddActivity}
              style={{
                backgroundColor: "#0ea5e6",
                color: "white",
                padding: "10px 20px",
                borderRadius: "5px",
                fontWeight: "bold",
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.3s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#0d8bc2")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#0ea5e6")}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Activity
            </button>
          </div>
        )}

        {/* Filtres stylisés */}
        <ul
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            listStyle: "none",
            marginBottom: "40px",
            flexWrap: "wrap",
            padding: "0",
          }}
        >
          {categories.map((category) => (
            <li
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              style={{
                padding: "10px 20px",
                cursor: "pointer",
                background: selectedCategory === category.value ? "#0ea5e6" : "#f1f1f1",
                color: selectedCategory === category.value ? "#fff" : "#333",
                borderRadius: "20px",
                transition: "all 0.3s ease",
                fontWeight: "bold",
                border: "2px solid transparent",
                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              {category.label}
            </li>
          ))}
        </ul>

        {/* Grille des activités */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "30px",
          }}
        >
          {currentActivities.length > 0 ? (
            currentActivities.map((activity, index) => (
              <div
                key={index}
                style={{
                  background: "#fff",
                  borderRadius: "15px",
                  overflow: "hidden",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                  transition: "transform 0.3s ease",
                  textAlign: "left",
                  position: "relative",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-10px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <img
                  src={
                    activity.imageUrl
                      ? `http://localhost:5000${activity.imageUrl}`
                      : "/assets/img/activities/default.png"
                  }
                  alt="Activity"
                  style={{ width: "100%", height: "250px", objectFit: "cover" }}
                  onClick={() => handleViewActivityModal(activity)}
                />

                <div style={{ padding: "20px" }}>
                  <h4>{stripHtmlTags(activity.title)}</h4>
                  <p>{stripHtmlTags(activity.description)}</p>
                </div>
                {userRole === "psychiatrist" ? (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px" }}>
                    <button
                      onClick={() => handleDelete(activity._id)}
                      style={{
                        backgroundColor: "#f44336",
                        color: "white",
                        padding: "10px 20px",
                        borderRadius: "5px",
                        marginTop: "20px",
                        fontWeight: "bold",
                      }}
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => handleEdit(activity)}
                      style={{
                        backgroundColor: "#0ea5e6",
                        color: "white",
                        padding: "10px 20px",
                        borderRadius: "5px",
                        marginTop: "20px",
                        fontWeight: "bold",
                      }}
                    >
                      Edit
                    </button>
                  </div>
                ) : userRole === "student" ? (
                  <div style={{ padding: "10px" }}>
                    <button
                      onClick={() => toggleFavoriteActivity(activity._id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "24px",
                        color: favoriteActivities.includes(activity._id) ? "#ff0000" : "#ccc",
                      }}
                    >
                      <FontAwesomeIcon
                        icon={favoriteActivities.includes(activity._id) ? faHeartSolid : faHeartRegular}
                      />
                    </button>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", gridColumn: "span 3" }}>
              <p>No activities available for this category.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: "40px",
              gap: "10px",
            }}
          >
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              style={{
                backgroundColor: currentPage === 1 ? "#ccc" : "#0ea5e6",
                color: "white",
                padding: "8px 16px",
                borderRadius: "5px",
                border: "none",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) =>
                currentPage !== 1 && (e.target.style.backgroundColor = "#0d8bc2")
              }
              onMouseLeave={(e) =>
                currentPage !== 1 && (e.target.style.backgroundColor = "#0ea5e6")
              }
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            {[...Array(totalPages)].map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  style={{
                    backgroundColor: currentPage === pageNumber ? "#0ea5e6" : "#f1f1f1",
                    color: currentPage === pageNumber ? "white" : "#333",
                    padding: "8px 16px",
                    borderRadius: "5px",
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 0.3s ease",
                    fontWeight: "bold",
                  }}
                  onMouseEnter={(e) =>
                    currentPage !== pageNumber && (e.target.style.backgroundColor = "#ddd")
                  }
                  onMouseLeave={(e) =>
                    currentPage !== pageNumber && (e.target.style.backgroundColor = "#f1f1f1")
                  }
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              style={{
                backgroundColor: currentPage === totalPages ? "#ccc" : "#0ea5e6",
                color: "white",
                padding: "8px 16px",
                borderRadius: "5px",
                border: "none",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) =>
                currentPage !== totalPages && (e.target.style.backgroundColor = "#0d8bc2")
              }
              onMouseLeave={(e) =>
                currentPage !== totalPages && (e.target.style.backgroundColor = "#0ea5e6")
              }
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}
      </div>

      {/* Modal pour confirmer la suppression d'une activité */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Deletion</h3>
            <p style={{ textAlign: "center" }}>Are you sure you want to delete this activity?</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={() => handleConfirmDelete(activityToDelete)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Yes, Delete
              </button>
              <button
                onClick={closeDeleteModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour confirmer le retrait d'une activité des favoris */}
      {showRemoveFavoriteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Removal</h3>
            <p style={{ textAlign: "center" }}>
              Are you sure you want to remove this activity from favorites?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={handleConfirmRemoveFavorite}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Yes, Remove
              </button>
              <button
                onClick={closeRemoveFavoriteModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour confirmer le vidage de tous les favoris */}
      {showClearAllFavoriteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Clear All</h3>
            <p style={{ textAlign: "center" }}>
              Are you sure you want to clear all favorite activities?
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={handleConfirmClearAllFavorites}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Yes, Clear All
              </button>
              <button
                onClick={closeClearAllFavoriteModal}
                style={{
                  backgroundColor: "#0ea5e6",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  marginTop: "20px",
                  fontWeight: "bold",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour afficher l'activité */}
      {showModal && selectedActivity && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
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
              maxWidth: "90%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            <img
              src={
                selectedActivity.imageUrl
                  ? `http://localhost:5000${selectedActivity.imageUrl}`
                  : "/assets/img/activities/default.png"
              }
              alt="Activity"
              style={{ width: "100%", height: "auto", borderRadius: "8px", marginBottom: "20px" }}
            />
            <h3>{stripHtmlTags(selectedActivity.title)}</h3>
            <p>{stripHtmlTags(selectedActivity.description)}</p>
            <button
              onClick={closeViewActivityModal}
              style={{
                backgroundColor: "#0ea5e6",
                color: "white",
                padding: "10px 20px",
                borderRadius: "5px",
                marginTop: "20px",
                fontWeight: "bold",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default Activities;