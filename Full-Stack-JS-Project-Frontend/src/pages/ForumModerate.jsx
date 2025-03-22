import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt, faEye } from "@fortawesome/free-regular-svg-icons";
import { faSearch, faHeart } from "@fortawesome/free-solid-svg-icons"; // Remplacement de faThumbtack par faHeart
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";

// Fonction pour couper la description à 3 lignes
const truncateDescription = (text, isExpanded) => {
  if (!isExpanded) {
    return `${text.substring(0, 150)}...`;
  }
  return text;
};

function ForumModerate() {
  const [forums, setForums] = useState([]);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [forumToDelete, setForumToDelete] = useState(null);
  const [comments, setComments] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [forumIdForComments, setForumIdForComments] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState("newest");
  const [favoriteTopics, setFavoriteTopics] = useState(new Set()); // Remplacement de pinnedTopics par favoriteTopics
  const [expanded, setExpanded] = useState({});
  const navigate = useNavigate();

  const toggleDescription = (forumId) => {
    setExpanded((prev) => ({
      ...prev,
      [forumId]: !prev[forumId],
    }));
  };

  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      setSearchQuery("");
    }
  };

  const filteredForums = forums
    .filter((forum) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      const titleMatch = forum.title.toLowerCase().includes(query);
      const descriptionMatch = forum.description.toLowerCase().includes(query);
      const tagsMatch =
        forum.tags && forum.tags.some((tag) => tag.toLowerCase().includes(query));
      return titleMatch || descriptionMatch || tagsMatch;
    })
    .sort((a, b) => {
      if (sortOption === "favorites") { // Changement de "pinned" à "favorites"
        const aIsFavorite = favoriteTopics.has(a._id);
        const bIsFavorite = favoriteTopics.has(b._id);

        if (aIsFavorite && !bIsFavorite) return -1;
        if (!aIsFavorite && bIsFavorite) return 1;

        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      } else {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOption === "newest" ? dateB - dateA : dateA - dateB;
      }
    });

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    console.log("Token from localStorage:", token);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log("Decoded token:", decoded);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          console.log("Token expiré.");
          localStorage.removeItem("jwt-token");
          setToken(null);
          setUserId(null);
          setIsLoading(false);
          return;
        }

        setToken(token);
        setUserId(decoded.id);
        console.log("Set userId to:", decoded.id);

        const storedFavoriteTopics = localStorage.getItem(`favoriteTopics_${decoded.id}`); // Changement de pinnedTopics à favoriteTopics
        if (storedFavoriteTopics) {
          setFavoriteTopics(new Set(JSON.parse(storedFavoriteTopics)));
        } else {
          setFavoriteTopics(new Set());
        }
      } catch (error) {
        console.error("Erreur de décodage du token:", error);
        localStorage.removeItem("jwt-token");
        setToken(null);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log("Aucun token trouvé.");
      setToken(null);
      setUserId(null);
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (userId) {
      const storedFavoriteTopics = localStorage.getItem(`favoriteTopics_${userId}`);
      if (storedFavoriteTopics) {
        setFavoriteTopics(new Set(JSON.parse(storedFavoriteTopics)));
      } else {
        setFavoriteTopics(new Set());
      }
    } else {
      setFavoriteTopics(new Set());
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`favoriteTopics_${userId}`, JSON.stringify([...favoriteTopics]));
    }
  }, [favoriteTopics, userId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const forumsResponse = await fetch("http://localhost:5000/forum/getForum");
        const forumsData = await forumsResponse.json();
        setForums(forumsData);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };

    fetchData();
  }, []);

  const handleDeleteComment = (commentId) => {
    fetch(`http://localhost:5000/forumComment/deleteComment/${commentId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Commentaire supprimé:", data);
        setComments(comments.filter((comment) => comment._id !== commentId));
        setShowDeleteCommentModal(false);
        toast.success("Comment deleted successfully!");
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression du commentaire:", error);
        toast.error("Failed to delete the comment!");
      });
  };

  const handleViewComments = async (forumId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/getComment/${forumId}`
      );
      const data = await response.json();

      if (response.ok) {
        setComments(data);
        setForumIdForComments(forumId);
        setShowCommentModal(true);
      } else {
        console.error(
          "Erreur lors de la récupération des commentaires:",
          data.message || data
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
    }
  };

  const handleDelete = (forumId) => {
    fetch(`http://localhost:5000/forum/deleteForum/${forumId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Forum supprimé:", data);
        setForums(forums.filter((forum) => forum._id !== forumId));
        setShowDeleteModal(false);
        toast.success("Topic deleted successfully!");
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression du forum:", error);
        toast.error("Failed to delete the topic!");
      });
  };

  const toggleFavorite = useCallback(
    (forumId) => {
      setFavoriteTopics((prevFavoriteTopics) => {
        const newFavoriteTopics = new Set(prevFavoriteTopics);
        const isFavorite = newFavoriteTopics.has(forumId);
        if (isFavorite) {
          newFavoriteTopics.delete(forumId);
          toast.success("Topic removed from favorites!", {
            toastId: `favorite-${forumId}`,
          });
        } else {
          newFavoriteTopics.add(forumId);
          toast.success("Topic added to favorites!", {
            toastId: `favorite-${forumId}`,
          });
        }
        return newFavoriteTopics;
      });
    },
    []
  );

  if (isLoading) {
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
          <div
            className="site-breadcrumb"
            style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}
          >
            <div className="container">
              <h2 className="breadcrumb-title">Moderate Forum</h2>
              <ul className="breadcrumb-menu">
                <li>
                  <a href="/Home">Home</a>
                </li>
                <li className="active">Moderate Forum</li>
              </ul>
            </div>
          </div>
          <div className="forum-area py-100">
            <div className="container" style={{ maxWidth: "800px", margin: "0 auto" }}>
              <p style={{ textAlign: "center", fontSize: "18px" }}>
                Loading...
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
        <div
          className="site-breadcrumb"
          style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}
        >
          <div className="container">
            <h2 className="breadcrumb-title">Moderate Forum</h2>
            <ul className="breadcrumb-menu">
              <li>
                <a href="/Home">Home</a>
              </li>
              <li className="active">Moderate Forum</li>
            </ul>
          </div>
        </div>

        <div className="forum-area py-100">
          <div
            className="container"
            style={{ maxWidth: "800px", margin: "0 auto" }}
          >
            <div className="forum-header d-flex justify-content-between align-items-center mb-4">
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
                      placeholder=" Search any topic..."
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
                  <option value="newest">Newest Topics</option>
                  <option value="oldest">Oldest Topics</option>
                  <option value="favorites">Favorite Topics</option> {/* Changement de "pinned" à "favorites" */}
                </select>
              </div>
            </div>

            <div
              className="forum-list"
              style={{
                maxWidth: "800px",
                margin: "0 auto",
                width: "100%",
              }}
            >
              {filteredForums.length > 0 ? (
                filteredForums.map((forum) => (
                  <div
                    key={forum._id}
                    className="forum-item p-4 border rounded mb-4"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center">
                        <img
                          src={`http://localhost:5000${forum.user_id.user_photo}`} // Suppression de la condition anonymous
                          alt="User"
                          className="rounded-circle me-2"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                          }}
                        />
                        <h6 className="mb-0 me-3">
                          {forum.user_id.username || "Utilisateur inconnu"} {/* Suppression de la condition anonymous */}
                        </h6>
                        {forum.user_id.level && forum.user_id.speciality && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: "transparent",
                              border: "1px solid #00BFFF",
                              color: "#00BFFF",
                              padding: "2px 8px",
                              borderRadius: "20px",
                              boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)",
                              fontSize: "0.875rem",
                            }}
                          >
                            {forum.user_id.level} {forum.user_id.speciality}
                          </span>
                        )}
                        {forum.tags && forum.tags.length > 0 && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: "transparent",
                              border: "1px solid #FF0000",
                              color: "#FF0000",
                              padding: "2px 8px",
                              borderRadius: "20px",
                              boxShadow: "0 0 10px rgba(255, 0, 0, 0.5)",
                              fontSize: "0.875rem",
                            }}
                          >
                            {forum.tags.join(", ")}
                          </span>
                        )}
                      </div>
                      <div className="d-flex align-items-center">
                        <span
                          className="icon"
                          style={{
                            cursor: "pointer",
                            fontSize: "20px",
                            color: "red",
                            marginRight: "15px",
                          }}
                          onClick={() => {
                            setForumToDelete(forum._id);
                            setShowDeleteModal(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </span>
                        <span
                          className="icon"
                          style={{
                            cursor: "pointer",
                            fontSize: "20px",
                            color: favoriteTopics.has(forum._id) ? "red" : "gray", // Changement de couleur pour le cœur
                          }}
                          onClick={() => toggleFavorite(forum._id)}
                        >
                          <FontAwesomeIcon icon={faHeart} /> {/* Remplacement de faThumbtack par faHeart */}
                        </span>
                      </div>
                    </div>
                    <h3
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        whiteSpace: "normal",
                        maxWidth: "100%",
                        margin: 0,
                      }}
                    >
                      {forum.title}
                    </h3>
                    <br />
                    <p
                      className="forum-description mb-0"
                      style={{
                        fontSize: "18px",
                        color: "black",
                        lineHeight: "1.5",
                      }}
                    >
                      {truncateDescription(
                        forum.description,
                        expanded[forum._id]
                      )}
                      {forum.description.length > 150 && (
                        <button
                          onClick={() => toggleDescription(forum._id)}
                          style={{
                            color: "#007bff",
                            fontSize: "18px",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                          }}
                        >
                          {expanded[forum._id] ? "See less" : "See more"}
                        </button>
                      )}
                    </p>
                    {forum.forum_photo && (
                      <img
                        src={forum.forum_photo}
                        alt="Forum"
                        className="forum-photo mt-2"
                        style={{
                          width: "100%",
                          height: "auto",
                          objectFit: "cover",
                          borderRadius: "20px",
                        }}
                      />
                    )}
                    <div className="d-flex align-items-center mt-2">
                      <button
                        onClick={() => handleViewComments(forum._id)}
                        className="btn btn-secondary d-flex align-items-center justify-content-center ms-2"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "5px",
                        }}
                      >
                        <FontAwesomeIcon icon={faEye} style={{ fontSize: "14px" }} />
                      </button>
                    </div>
                    <div className="mt-3 text-muted" style={{ fontSize: "14px" }}>
                      <p style={{ margin: 0 }}>
                        Posted at :{" "}
                        {new Date(forum.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p>There is no topic here!</p>
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
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Confirm Deletion
            </h3>
            <p style={{ marginBottom: "20px", textAlign: "center" }}>
              Are you sure you want to delete this topic? This action cannot be undone.
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
                onClick={() => handleDelete(forumToDelete)}
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

      {showCommentModal && (
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
              width: "900px",
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Comments
            </h3>
            <div
              style={{
                maxHeight: comments.length > 3 ? "300px" : "auto",
                overflowY: comments.length > 3 ? "auto" : "visible",
                marginBottom: "20px",
              }}
            >
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      padding: "10px",
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        flex: 1,
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        <img
                          src={`http://localhost:5000${comment.user_id.user_photo}`} // Suppression de la condition anonymous
                          alt="User Avatar"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "bold" }}>
                          {comment.user_id.username} {/* Suppression de la condition anonymous */}
                          <span
                            className="badge"
                            style={{
                              backgroundColor: "transparent",
                              border: "1px solid #00BFFF",
                              color: "#00BFFF",
                              padding: "2px 8px",
                              borderRadius: "20px",
                              boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)",
                              fontSize: "0.875rem",
                            }}
                          >
                            {comment.user_id.level} {comment.user_id.speciality}
                          </span>
                        </p>
                        <p
                          style={{
                            margin: 0,
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                            whiteSpace: "normal",
                            color: "#333",
                          }}
                        >
                          {comment.content}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span
                        className="icon"
                        style={{ cursor: "pointer", fontSize: "18px", color: "red" }}
                        onClick={() => {
                          setCommentToDelete(comment._id);
                          setShowDeleteCommentModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center" }}>There is no comment here!</p>
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
                onClick={() => setShowCommentModal(false)}
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

      {showDeleteCommentModal && (
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
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={() => setShowDeleteCommentModal(false)}
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
                onClick={() => handleDeleteComment(commentToDelete)}
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
    </div>
  );
}

export default ForumModerate;