import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
  faPaperPlane,
  faEye,
  faFlag,
  faSmile, // Icône pour ouvrir le sélecteur d'emojis
} from "@fortawesome/free-regular-svg-icons";
import {
  faSearch,
  faThumbtack,
} from "@fortawesome/free-solid-svg-icons";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react"; // Importer le composant EmojiPicker

// Fonction pour couper la description à 3 lignes
const truncateDescription = (text, isExpanded) => {
  if (!isExpanded) {
    return `${text.substring(0, 150)}...`;
  }
  return text;
};

function Forum() {
  const [forums, setForums] = useState([]);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [forumToDelete, setForumToDelete] = useState(null);
  const [forumToUpdate, setForumToUpdate] = useState(null);
  const [updatedTitle, setUpdatedTitle] = useState("");
  const [updatedDescription, setUpdatedDescription] = useState("");
  const [updatedPhoto, setUpdatedPhoto] = useState(null);
  const [updatedAnonymous, setUpdatedAnonymous] = useState(false);
  const [comment, setComment] = useState({});
  const [expanded, setExpanded] = useState({});
  const [anonymous, setAnonymous] = useState(false);
  const [comments, setComments] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [forumIdForComments, setForumIdForComments] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [updatedTag, setUpdatedTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState("newest");
  const [showUpdateCommentModal, setShowUpdateCommentModal] = useState(false);
  const [commentToUpdate, setCommentToUpdate] = useState(null);
  const [updatedCommentContent, setUpdatedCommentContent] = useState("");
  const [showReportForumModal, setShowReportForumModal] = useState(false);
  const [forumToReport, setForumToReport] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [showReportCommentModal, setShowReportCommentModal] = useState(false);
  const [commentToReport, setCommentToReport] = useState(null);
  const [commentReportReason, setCommentReportReason] = useState("");
  const [pinnedTopics, setPinnedTopics] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState({}); // État pour gérer l'affichage du sélecteur d'emojis par forum
  const navigate = useNavigate();

  // Fonction pour basculer l'état d'expansion
  const toggleDescription = (forumId) => {
    setExpanded((prev) => ({
      ...prev,
      [forumId]: !prev[forumId],
    }));
  };

  // Fonction pour basculer l'affichage du champ de recherche
  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      setSearchQuery("");
    }
  };

  // Fonction pour basculer l'affichage du sélecteur d'emojis
  const toggleEmojiPicker = (forumId) => {
    setShowEmojiPicker((prev) => ({
      ...prev,
      [forumId]: !prev[forumId],
    }));
  };

  // Fonction pour ajouter un emoji au commentaire
  const onEmojiClick = (forumId, emojiObject) => {
    setComment((prev) => ({
      ...prev,
      [forumId]: (prev[forumId] || "") + emojiObject.emoji,
    }));
    setShowEmojiPicker((prev) => ({
      ...prev,
      [forumId]: false, // Ferme le sélecteur après sélection
    }));
  };

  // Filtrer et trier les forums
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
      if (sortOption === "pinned") {
        const aIsPinned = pinnedTopics.has(a._id);
        const bIsPinned = pinnedTopics.has(b._id);

        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;

        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      } else {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOption === "newest" ? dateB - dateA : dateA - dateB;
      }
    });

  // Liste des tags prédéfinis
  const tagOptions = [
    "anxiety",
    "stress",
    "depression",
    "burnout",
    "studies",
    "loneliness",
    "motivation",
    "support",
    "insomnia",
    "pressure",
  ];

  // Charger le token, l'ID utilisateur, le rôle et les topics épinglés au montage
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
          setUserRole(null);
          setPinnedTopics(new Set());
          return;
        }

        setToken(token);
        setUserId(decoded.id);
        setUserRole(decoded.role);
        console.log("User role:", decoded.role);

        const storedPinnedTopics = localStorage.getItem(`pinnedTopics_${decoded.id}`);
        if (storedPinnedTopics) {
          setPinnedTopics(new Set(JSON.parse(storedPinnedTopics)));
        } else {
          setPinnedTopics(new Set());
        }
      } catch (error) {
        console.error("Erreur de décodage du token:", error);
        localStorage.removeItem("jwt-token");
        setToken(null);
        setUserId(null);
        setUserRole(null);
        setPinnedTopics(new Set());
      }
    } else {
      console.log("Aucun token trouvé.");
      setToken(null);
      setUserId(null);
      setUserRole(null);
      setPinnedTopics(new Set());
    }
  }, [token]);

  // Surveiller les changements de userId pour recharger les topics épinglés
  useEffect(() => {
    if (userId) {
      const storedPinnedTopics = localStorage.getItem(`pinnedTopics_${userId}`);
      if (storedPinnedTopics) {
        setPinnedTopics(new Set(JSON.parse(storedPinnedTopics)));
      } else {
        setPinnedTopics(new Set());
      }
    } else {
      setPinnedTopics(new Set());
    }
  }, [userId]);

  // Sauvegarder les topics épinglés dans le localStorage à chaque modification
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`pinnedTopics_${userId}`, JSON.stringify([...pinnedTopics]));
    }
  }, [pinnedTopics, userId]);

  // Affichage des forums
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

  // Ajouter un commentaire à un forum
  const handleAddComment = async (forumId, content, anonymous) => {
    if (!userId) {
      console.log("User not authenticated.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/addComment/${userId}/${forumId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content, anonymous }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log("Comment added:", data);
        toast.success("Your Comment is added successfully!");
        setComment((prev) => ({
          ...prev,
          [forumId]: "",
        }));
      } else {
        console.error("Error adding comment:", data.message || data);
        toast.error("Failed to add your comment");
      }
    } catch (error) {
      console.error("Error in API call:", error);
    }
  };

  // Suppression d'un commentaire
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
        toast.success("Your comment was deleted successfully!");
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression du commentaire:", error);
        toast.error("Failed to delete your comment!");
      });
  };

  // Afficher les commentaires
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

  // Supprimer un forum
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
        toast.success("Your topic was deleted successfully !");
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression du forum:", error);
        toast.error("Failed to delete your topic !");
      });
  };

  // Mettre à jour un forum
  const handleUpdate = (forumId) => {
    const formData = new FormData();
    formData.append("title", updatedTitle);
    formData.append("description", updatedDescription);
    formData.append("anonymous", updatedAnonymous);
    formData.append("tags", JSON.stringify(updatedTag ? [updatedTag] : []));
    if (updatedPhoto) {
      formData.append("forum_photo", updatedPhoto);
    }

    fetch(`http://localhost:5000/forum/updateForum/${forumId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Forum mis à jour:", data);
        setForums(
          forums.map((forum) =>
            forum._id === forumId
              ? {
                  ...forum,
                  title: updatedTitle,
                  description: updatedDescription,
                  forum_photo: updatedPhoto
                    ? URL.createObjectURL(updatedPhoto)
                    : forum.forum_photo,
                  anonymous: updatedAnonymous,
                  tags: updatedTag ? [updatedTag] : [],
                }
              : forum
          )
        );
        setShowUpdateModal(false);
        toast.success("Your topic is updated successfully!");
      })
      .catch((error) => {
        console.error("Erreur lors de la mise à jour du forum:", error);
        toast.error("Failed to update your topic !");
      });
  };

  // Mettre à jour un commentaire
  const handleUpdateComment = async (commentId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/updateComment/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: updatedCommentContent }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment._id === commentId
              ? { ...comment, content: updatedCommentContent }
              : comment
          )
        );
        setShowUpdateCommentModal(false);
        toast.success("Your comment was updated successfully!");
      } else {
        console.error("Erreur lors de la mise à jour du commentaire:", data.message);
        toast.error("Failed to update your comment!");
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      toast.error("Failed to update your comment!");
    }
  };

  // Signaler un forum
  const handleReportForum = async () => {
    if (!reportReason) {
      toast.error("Please select a reason for reporting!");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/forum/reportForum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          forum_id: forumToReport,
          user_id: userId,
          reason: reportReason,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success("Forum reported successfully!");
        setShowReportForumModal(false);
        setReportReason("");
      } else {
        toast.error("Failed to report forum: " + data.message);
      }
    } catch (error) {
      toast.error("Error reporting forum: " + error.message);
    }
  };

  // Signaler un commentaire
  const handleReportComment = async () => {
    if (!commentReportReason) {
      toast.error("Please select a reason for reporting!");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/forumComment/reportComment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            comment_id: commentToReport,
            user_id: userId,
            reason: commentReportReason,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        toast.success("Comment reported successfully!");
        setShowReportCommentModal(false);
        setCommentReportReason("");
      } else {
        toast.error("Failed to report comment: " + data.message);
      }
    } catch (error) {
      toast.error("Error reporting comment: " + error.message);
    }
  };

  // Fonction pour basculer l'état "pinned/unpinned" avec useCallback
  const togglePin = useCallback(
    (forumId) => {
      setPinnedTopics((prevPinnedTopics) => {
        const newPinnedTopics = new Set(prevPinnedTopics);
        const isPinned = newPinnedTopics.has(forumId);
        if (isPinned) {
          newPinnedTopics.delete(forumId);
          toast.success("Topic unpinned!", {
            toastId: `pin-${forumId}`,
          });
        } else {
          newPinnedTopics.add(forumId);
          toast.success("Topic pinned!", {
            toastId: `pin-${forumId}`,
          });
        }
        return newPinnedTopics;
      });
    },
    []
  );

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
            <h2 className="breadcrumb-title">Forum</h2>
            <ul className="breadcrumb-menu">
              <li>
                <a href="/Home">Home</a>
              </li>
              <li className="active">Forum</li>
            </ul>
          </div>
        </div>

        {/* Forum Section */}
        <div className="forum-area py-100">
          <div
            className="container"
            style={{ maxWidth: "800px", margin: "0 auto" }}
          >
            <div className="forum-header d-flex justify-content-between align-items-center mb-4">
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
              {/* Conteneur pour la liste déroulante et les boutons */}
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
                  <option value="newest">Newest Topics</option>
                  <option value="oldest">Oldest Topics</option>
                  <option value="pinned">Pinned Topics</option>
                </select>

                {/* Bouton Add New Topic */}
                <button
                  className="theme-btn"
                  style={{
                    borderRadius: "50px",
                    marginRight: "10px",
                  }}
                  onClick={() => navigate("/addforum")}
                >
                  New Topic
                </button>

                {/* Bouton Moderate (affiché uniquement pour teacher ou psychiatrist) */}
                {userRole && ["teacher", "psychiatrist"].includes(userRole) && (
                  <button
                    className="theme-btn"
                    style={{
                      borderRadius: "50px",
                      backgroundColor: "#ff4d4f",
                    }}
                    onClick={() => navigate("/moderateForum")}
                  >
                    Moderate
                  </button>
                )}
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
                          src={
                            forum.anonymous
                              ? "assets/img/anonymous_member.png"
                              : `http://localhost:5000${forum.user_id.user_photo}`
                          }
                          alt="User"
                          className="rounded-circle me-2"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                          }}
                        />
                        <h6 className="mb-0 me-3">
                          {forum.anonymous
                            ? "Anonymous member"
                            : forum.user_id.username || "Utilisateur inconnu"}
                        </h6>
                        {!forum.anonymous &&
                          forum.user_id.level &&
                          forum.user_id.speciality && (
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
                        {userId &&
                          forum.user_id &&
                          userId === forum.user_id._id && (
                            <>
                              <span
                                className="icon"
                                style={{
                                  cursor: "pointer",
                                  fontSize: "20px",
                                  color: "#007bff",
                                  marginRight: "15px",
                                }}
                                onClick={() => {
                                  setForumToUpdate(forum);
                                  setUpdatedTitle(forum.title);
                                  setUpdatedDescription(forum.description);
                                  setUpdatedAnonymous(forum.anonymous);
                                  setShowUpdateModal(true);
                                  setUpdatedTag(
                                    forum.tags && forum.tags.length > 0
                                      ? forum.tags[0]
                                      : ""
                                  );
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
                                  marginRight: "15px",
                                }}
                                onClick={() => {
                                  setForumToDelete(forum._id);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </span>
                            </>
                          )}
                        {userId && (
                          <span
                            className="icon"
                            style={{
                              cursor: "pointer",
                              fontSize: "20px",
                              color: "orange",
                              marginRight: "15px",
                            }}
                            onClick={() => {
                              setForumToReport(forum._id);
                              setShowReportForumModal(true);
                            }}
                          >
                            <FontAwesomeIcon icon={faFlag} />
                          </span>
                        )}
                        {userId && (
                          <span
                            className="icon"
                            style={{
                              cursor: "pointer",
                              fontSize: "20px",
                              color: pinnedTopics.has(forum._id) ? "#007bff" : "gray",
                              transform: pinnedTopics.has(forum._id) ? "rotate(-45deg)" : "none",
                              transition: "transform 0.3s ease",
                            }}
                            onClick={() => togglePin(forum._id)}
                          >
                            <FontAwesomeIcon icon={faThumbtack} />
                          </span>
                        )}
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
                    <div className="d-flex align-items-center mt-2 position-relative">
                      <input
                        type="text"
                        placeholder="Type your comment..."
                        className="form-control rounded-pill me-2"
                        style={{
                          border: "1px solid #007bff",
                          paddingLeft: "10px",
                          fontSize: "14px",
                          maxWidth: "90%",
                          paddingRight: "40px", // Espace pour l'icône emoji
                        }}
                        value={comment[forum._id] || ""}
                        onChange={(e) =>
                          setComment((prev) => ({
                            ...prev,
                            [forum._id]: e.target.value,
                          }))
                        }
                      />
                      {/* Icône pour ouvrir le sélecteur d'emojis */}
                      <FontAwesomeIcon
                        icon={faSmile}
                        style={{
                          position: "absolute",
                          right: "100px", // Ajuster selon l'espace nécessaire
                          top: "50%",
                          transform: "translateY(-50%)",
                          fontSize: "18px",
                          color: "#007bff",
                          cursor: "pointer",
                        }}
                        onClick={() => toggleEmojiPicker(forum._id)}
                      />
                      {/* Sélecteur d'emojis */}
                      {showEmojiPicker[forum._id] && (
                        <div
                          style={{
                            position: "absolute",
                            zIndex: 1000,
                            bottom: "50px", // Positionner au-dessus de l'input
                            right: "0",
                          }}
                        >
                          <EmojiPicker
                            onEmojiClick={(emojiObject) => onEmojiClick(forum._id, emojiObject)}
                            width={300}
                            height={400}
                          />
                        </div>
                      )}
                      <button
                        onClick={() =>
                          handleAddComment(
                            forum._id,
                            comment[forum._id] || "",
                            anonymous
                          )
                        }
                        className="btn btn-primary d-flex align-items-center justify-content-center"
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
                        <FontAwesomeIcon icon={faPaperPlane} style={{ fontSize: "14px" }} />
                      </button>
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
                    <div className="mt-2 d-flex align-items-center">
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          border: "1px solid black",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          marginRight: "10px",
                          transition: "background-color 0.3s ease",
                          backgroundColor: anonymous ? "rgba(0, 128, 0, 0.2)" : "white",
                        }}
                        onClick={() => setAnonymous(!anonymous)}
                      >
                        <div
                          style={{
                            width: anonymous ? "10px" : "0px",
                            height: anonymous ? "10px" : "0px",
                            backgroundColor: "green",
                            borderRadius: "50%",
                            transition: "all 0.3s ease",
                            opacity: anonymous ? 1 : 0,
                          }}
                        />
                      </div>
                      <label
                        htmlFor="anonymousComment"
                        style={{
                          fontSize: "14px",
                          color: "black",
                          cursor: "pointer",
                        }}
                        onClick={() => setAnonymous(!anonymous)}
                      >
                        Anonymous comment ?
                      </label>
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
                <p>There is any topic here !</p>
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
              Are you sure you want to delete this forum? This action cannot be
              undone.
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

      {/* Modal de mise à jour du forum */}
      {showUpdateModal && forumToUpdate && (
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
              Update Forum
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Title:</label>
              <input
                type="text"
                value={updatedTitle}
                onChange={(e) => setUpdatedTitle(e.target.value)}
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
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Anonymous:</label>
              <select
                value={updatedAnonymous}
                onChange={(e) => setUpdatedAnonymous(e.target.value === "true")}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Tag:</label>
              <select
                value={updatedTag}
                onChange={(e) => setUpdatedTag(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="">Select a tag</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label>Forum Photo:</label>
              <input
                type="file"
                onChange={(e) => setUpdatedPhoto(e.target.files[0])}
                style={{ width: "100%" }}
              />
              {updatedPhoto && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "10px",
                  }}
                >
                  <img
                    src={URL.createObjectURL(updatedPhoto)}
                    alt="Choisir une image"
                    style={{
                      maxWidth: "200px",
                      maxHeight: "200px",
                      borderRadius: "100px",
                    }}
                  />
                </div>
              )}
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
                onClick={() => handleUpdate(forumToUpdate._id)}
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
      {/* Modal de commentaires */}
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
                          src={
                            comment.anonymous
                              ? "/assets/img/anonymous_member.png"
                              : `http://localhost:5000${comment.user_id.user_photo}`
                          }
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
                        {comment.anonymous ? (
                          <p style={{ margin: 0, fontWeight: "bold" }}>
                            Anonymous Member
                          </p>
                        ) : (
                          <p style={{ margin: 0, fontWeight: "bold" }}>
                            {comment.user_id.username}
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
                        )}
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
                      {userId === comment.user_id._id && (
                        <span
                          className="icon"
                          style={{ cursor: "pointer", fontSize: "18px", color: "#007bff" }}
                          onClick={() => {
                            setCommentToUpdate(comment);
                            setUpdatedCommentContent(comment.content);
                            setShowUpdateCommentModal(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </span>
                      )}
                      {userId === comment.user_id._id && (
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
                      )}
                      {userId && (
                        <span
                          className="icon"
                          style={{ cursor: "pointer", fontSize: "18px", color: "orange" }}
                          onClick={() => {
                            setCommentToReport(comment._id);
                            setShowReportCommentModal(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faFlag} />
                        </span>
                      )}
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
      {/* Modal de confirmation de suppression de commentaire */}
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
              Are you sure you want to delete this comment? This action cannot
              be undone.
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
      {/* Modal de mise à jour du commentaire */}
      {showUpdateCommentModal && commentToUpdate && (
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
              Update Comment
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Comment Content:</label>
              <textarea
                value={updatedCommentContent}
                onChange={(e) => setUpdatedCommentContent(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "10px",
                  border: "1px solid #ddd",
                  minHeight: "100px",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={() => setShowUpdateCommentModal(false)}
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
                onClick={() => handleUpdateComment(commentToUpdate._id)}
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
      {/* Modal de signalement de forum */}
      {showReportForumModal && (
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
              Report Forum
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Reason for reporting:</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="">Select a reason</option>
                <option value="inappropriate_content">Inappropriate Content</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="offensive_language">Offensive Language</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={() => {
                  setShowReportForumModal(false);
                  setReportReason("");
                }}
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
                onClick={handleReportForum}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de signalement de commentaire */}
      {showReportCommentModal && (
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
              Report Comment
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Reason for reporting:</label>
              <select
                value={commentReportReason}
                onChange={(e) => setCommentReportReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="">Select a reason :</option>
                <option value="inappropriate_content">Inappropriate Content</option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="offensive_language">Offensive Language</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                onClick={() => {
                  setShowReportCommentModal(false);
                  setCommentReportReason("");
                }}
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
                onClick={handleReportComment}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Forum;