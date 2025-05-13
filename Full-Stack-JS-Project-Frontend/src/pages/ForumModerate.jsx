import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrashAlt,
  faToggleOn,
  faToggleOff,
  faFlag,
  faBan,
  faUserSlash,
  faComment,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { addNotification } from "../utils/notificationUtils";

// Fonction pour couper la description à 150 caractères
const truncateDescription = (text, isExpanded) => {
  if (!isExpanded && text.length > 150) {
    return `${text.substring(0, 150)}...`;
  }
  return text;
};

// Fonction pour générer l'URL du QR code avec les informations de ban
const generateQRCodeUrl = (user) => {
  const qrData = `Username: ${user.user_id.username}\nLevel and Speciality: ${
    user.user_id.level || "N/A"
  } ${user.user_id.speciality || "N/A"}\nReason of ban: ${
    user.reason
  }\nBan expires: ${new Date(user.expiresAt).toLocaleString("fr-FR")}`;
  const encodedData = encodeURIComponent(qrData);
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodedData}&size=120x120`;
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
  const [expanded, setExpanded] = useState({});
  const [showPertinentOnly, setShowPertinentOnly] = useState(false);
  const [commentsCountMap, setCommentsCountMap] = useState({});
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reports, setReports] = useState([]);
  const [showCommentReportsModal, setShowCommentReportsModal] = useState(false);
  const [commentReports, setCommentReports] = useState([]);
  const [showBanModal, setShowBanModal] = useState(false);
  const [userToBan, setUserToBan] = useState(null);
  const [banDuration, setBanDuration] = useState("");
  const [banReason, setBanReason] = useState("");
  const [showBannedListModal, setShowBannedListModal] = useState(false);
  const [bannedUsers, setBannedUsers] = useState([]);
  const [commentSentiments, setCommentSentiments] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const topicsPerPage = 4; // 4 topics per page (2 rows of 2 topics each)
  const navigate = useNavigate();

  const classifyText = async (text) => {
    const cacheKey = `sentiment_${text}`;
    const cachedResult = localStorage.getItem(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    const REACT_APP_HUGGINGFACE_API_TOKEN = "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";
    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${REACT_APP_HUGGINGFACE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text }),
        }
      );

      if (!response.ok) {
        console.error("Erreur HTTP:", response.status, response.statusText);
        const errorData = await response.json();
        console.error("Détails de l'erreur:", errorData);
        return "UNKNOWN";
      }

      const data = await response.json();
      console.log("Réponse de l'API Hugging Face:", data);

      if (data && data[0] && data[0][0] && data[0][0].label) {
        const sentiment = data[0][0].label;
        localStorage.setItem(cacheKey, sentiment);
        return sentiment;
      } else {
        console.error("Structure inattendue de la réponse:", data);
        return "UNKNOWN";
      }
    } catch (error) {
      console.error("Erreur lors de la classification:", error);
      return "UNKNOWN";
    }
  };

  const handleAnalyzeSentiment = async () => {
    setIsAnalyzing(true);
    const sentiments = {};
    for (let i = 0; i < comments.length; i++) {
      const comment = comments[i];
      const sentiment = await classifyText(comment.content);
      sentiments[comment._id] = sentiment;
    }
    setCommentSentiments(sentiments);
    setIsAnalyzing(false);
  };

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

  const fetchCommentsCount = async (forumId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/getComment/${forumId}`
      );
      const data = await response.json();
      if (response.ok) {
        return data.length;
      } else {
        console.error(
          "Erreur lors de la récupération des commentaires:",
          data.message || data
        );
        return 0;
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      return 0;
    }
  };

  const fetchBannedUsers = async () => {
    try {
      console.log("Token used for fetchBannedUsers:", token);
      const response = await fetch("http://localhost:5000/forum/banned-users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      console.log("Response from API:", data);

      if (response.ok) {
        console.log("Setting bannedUsers to:", data.bannedUsers);
        setBannedUsers(data.bannedUsers);
        setShowBannedListModal(true);
      } else {
        console.error(
          "Erreur lors de la récupération des utilisateurs bannis:",
          data.message || data
        );
        toast.error("Failed to fetch banned users!");
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      toast.error("Error fetching banned users!");
    }
  };

  const handleUnbanUser = async (banId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forum/unban/${banId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "User unbanned successfully!");
        setBannedUsers(bannedUsers.filter((user) => user._id !== banId));
        const bannedUser = bannedUsers.find((user) => user._id === banId);
        if (bannedUser && bannedUser.user_id) {
          const message = `You have been unbanned by a moderator. You can now participate in the forum again.`;
          addNotification(bannedUser.user_id._id, message, "unban");
        }
      } else {
        toast.error(data.message || "Failed to unban user!");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du ban:", error);
      toast.error("Error unbanning user!");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const forumsResponse = await fetch(
          "http://localhost:5000/forum/getForum"
        );
        const forumsData = await forumsResponse.json();
        setForums(forumsData);

        const commentsCount = {};
        for (const forum of forumsData) {
          const count = await fetchCommentsCount(forum._id);
          commentsCount[forum._id] = count;
        }
        setCommentsCountMap(commentsCount);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };

    fetchData();
  }, []);

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
  }, []);

  const filterPertinentForums = (forums) => {
    return forums.filter((forum) => {
      const commentsCount = commentsCountMap[forum._id] || 0;
      const pinnedCount =
        forum.pinned && Array.isArray(forum.pinned)
          ? forum.pinned.length
          : forum.pinned || 0;
      const likesCount =
        forum.likes && Array.isArray(forum.likes)
          ? forum.likes.length
          : forum.likes || 0;

      const isPertinent =
        commentsCount > 5 || pinnedCount > 5 || likesCount > 5;
      return showPertinentOnly ? isPertinent : true;
    });
  };

  const filteredForums = filterPertinentForums(
    forums
      .filter((forum) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const titleMatch = forum.title.toLowerCase().includes(query);
        const descriptionMatch = forum.description
          .toLowerCase()
          .includes(query);
        const tagsMatch =
          forum.tags &&
          forum.tags.some((tag) => tag.toLowerCase().includes(query));
        return titleMatch || descriptionMatch || tagsMatch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOption === "newest" ? dateB - dateA : dateA - dateB;
      })
  );

  const indexOfLastTopic = currentPage * topicsPerPage;
  const indexOfFirstTopic = indexOfLastTopic - topicsPerPage;
  const currentTopics = filteredForums.slice(indexOfFirstTopic, indexOfLastTopic);
  const totalPages = Math.ceil(filteredForums.length / topicsPerPage);

  const handleChangeStatus = async (forumId, newStatus) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forum/changeStatus/${forumId}`,
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
        setForums((prevForums) =>
          prevForums.map((forum) =>
            forum._id === forumId ? { ...forum, status: newStatus } : forum
          )
        );
        toast.success(
          `Topic ${
            newStatus === "actif" ? "activated" : "deactivated"
          } successfully!`
        );
        const forum = forums.find((f) => f._id === forumId);
        if (forum && forum.user_id) {
          const message = `Your post "${forum.title}" has been ${
            newStatus === "actif" ? "activated" : "deactivated"
          } by a moderator.`;
          addNotification(forum.user_id._id, message, "status_changed");
        }
      } else {
        console.error("Erreur lors du changement de statut:", data.message);
        toast.error("Failed to change topic status!");
      }
    } catch (error) {
      console.error("Erreur réseau:", error);
      toast.error("Network error while changing topic status!");
    }
  };

  const handleDeleteComment = (commentId) => {
    const comment = comments.find((c) => c._id === commentId);
    if (!comment) return;

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
        const message = `Your comment "${comment.content}" has been deleted by a moderator.`;
        addNotification(comment.user_id._id, message, "comment_deleted");
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
    const forum = forums.find((f) => f._id === forumId);
    if (!forum) return;

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
        const message = `Your post "${forum.title}" has been deleted by a moderator.`;
        addNotification(forum.user_id._id, message, "post_deleted");
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression du forum:", error);
        toast.error("Failed to delete the topic!");
      });
  };

  const handleViewReports = async (forumId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forum/getForumReports/${forumId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        setReports(data);
        setShowReportsModal(true);
      } else {
        console.error(
          "Erreur lors de la récupération des signalements:",
          data.message || data
        );
        toast.error("Failed to fetch reports for this topic!");
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      toast.error("Error fetching reports!");
    }
  };

  const handleViewCommentReports = async (commentId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/getCommentReports/${commentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        setCommentReports(data);
        setShowCommentReportsModal(true);
      } else {
        console.error(
          "Erreur lors de la récupération des signalements de commentaire:",
          data.message || data
        );
        toast.error("Failed to fetch reports for this comment!");
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      toast.error("Error fetching comment reports!");
    }
  };

  const handleDeleteForumReport = async (reportId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forum/reports/${reportId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setReports(reports.filter((report) => report._id !== reportId));
      } else {
        toast.error(data.message || "Failed to delete report!");
      }
    } catch (error) {
      console.error("Erreur lors de la suppression du signalement:", error);
      toast.error("Error deleting report!");
    }
  };

  const handleDeleteCommentReport = async (reportId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/reports/${reportId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setCommentReports(
          commentReports.filter((report) => report._id !== reportId)
        );
      } else {
        toast.error(data.message || "Failed to delete comment report!");
      }
    } catch (error) {
      console.error(
        "Erreur lors de la suppression du signalement de commentaire:",
        error
      );
      toast.error("Error deleting comment report!");
    }
  };

  const handleOpenBanModal = (userId) => {
    setUserToBan(userId);
    setBanDuration("");
    setBanReason("");
    setShowBanModal(true);
  };

  const handleBanUser = async () => {
    if (!banDuration || isNaN(banDuration) || banDuration <= 0) {
      toast.error("Please enter a valid duration in days.");
      return;
    }

    if (
      ![
        "inappropriate_content",
        "spam",
        "harassment",
        "offensive_language",
        "misinformation",
        "other",
      ].includes(banReason)
    ) {
      toast.error("Please select a valid reason.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/forum/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userToBan,
          reason: banReason,
          duration: parseInt(banDuration),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || "User banned successfully!");
        setShowBanModal(false);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(banDuration));
        const message = `You have been banned for ${banReason}. Ban expires on ${expiresAt.toLocaleString(
          "fr-FR"
        )}.`;
        addNotification(userToBan, message, "ban");
      } else {
        toast.error(data.message || "Failed to ban user.");
      }
    } catch (error) {
      console.error("Error banning user:", error);
      toast.error("Error banning user: " + error.message);
    }
  };

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
            <div
              className="container"
              style={{ maxWidth: "1200px", margin: "0 auto" }}
            >
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
              <li>
                <a href="/forum">Forum</a>
              </li>
              <li className="active">Moderate Forum</li>
            </ul>
          </div>
        </div>

        <div className="forum-area py-100">
          <div
            className="container"
            style={{ maxWidth: "1200px", margin: "0 auto" }}
          >
            <div className="forum-header d-flex justify-content-between align-items-center mb-4">
              <div
                style={{
                  position: "relative",
                  width: isSearchOpen ? "700px" : "40px",
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
                      placeholder="Search topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: "10px 10px 10px 40px",
                        borderRadius: "25px",
                        border: "1px solid #007bff",
                        outline: "none",
                        width: "100%",
                        boxSizing: "border-box",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                  </>
                )}
              </div>
              <div className="d-flex align-items-center gap-3">
                <button
                  onClick={() => setShowPertinentOnly(!showPertinentOnly)}
                  className="theme-btn"
                  style={{
                    padding: "10px 20px",
                    backgroundColor: showPertinentOnly ? "#0056b3" : "#007bff",
                    color: "white",
                    border: "none",
                    borderRadius: "25px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {showPertinentOnly
                    ? "Show All Topics"
                    : "Show Pertinent Topics"}
                </button>
                <button
                  onClick={fetchBannedUsers}
                  className="banned-list-btn"
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#ff9800",
                    color: "white",
                    border: "none",
                    borderRadius: "25px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#e68900";
                    e.target.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "#ff9800";
                    e.target.style.transform = "scale(1)";
                  }}
                >
                  Banned List
                </button>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "25px",
                    border: "1px solid #007bff",
                    outline: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    backgroundColor: "white",
                    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <option value="newest">Newest Topics</option>
                  <option value="oldest">Oldest Topics</option>
                </select>
              </div>
            </div>

            <div className="forum-list">
              {currentTopics.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "30px" }}>
                  {currentTopics.map((forum) => (
                    <div
                      key={forum._id}
                      className="forum-item"
                      style={{
                        backgroundColor: "white",
                        borderRadius: "15px",
                        padding: "20px",
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
                        opacity: forum.status === "inactif" ? 0.6 : 1,
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={`http://localhost:5000${forum.user_id.user_photo}`}
                            alt="User"
                            className="rounded-circle"
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "cover",
                              border: "2px solid #007bff",
                            }}
                          />
                          <div>
                            <h6 className="mb-1" style={{ fontSize: "16px", fontWeight: "600" }}>
                              {forum.user_id.username || "Utilisateur inconnu"}
                            </h6>
                            {forum.user_id.level && forum.user_id.speciality && (
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: "#e6f7ff",
                                  color: "#007bff",
                                  padding: "5px 10px",
                                  borderRadius: "15px",
                                  fontSize: "12px",
                                }}
                              >
                                {forum.user_id.level} {forum.user_id.speciality}
                              </span>
                            )}
                            {forum.tags && forum.tags.length > 0 && (
                              <span
                                className="badge ms-2"
                                style={{
                                  backgroundColor: "#ffe6e6",
                                  color: "#ff0000",
                                  padding: "5px 10px",
                                  borderRadius: "15px",
                                  fontSize: "12px",
                                }}
                              >
                                {forum.tags.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span
                            className="icon"
                            style={{
                              cursor: "pointer",
                              fontSize: "20px",
                              color: forum.status === "actif" ? "orange" : "green",
                            }}
                            onClick={() =>
                              handleChangeStatus(
                                forum._id,
                                forum.status === "actif" ? "inactif" : "actif"
                              )
                            }
                            title={forum.status === "actif" ? "Désactiver" : "Activer"}
                          >
                            <FontAwesomeIcon
                              icon={forum.status === "actif" ? faToggleOff : faToggleOn}
                            />
                          </span>
                          <span
                            className="icon"
                            style={{
                              cursor: "pointer",
                              fontSize: "20px",
                              color: "red",
                            }}
                            onClick={() => {
                              setForumToDelete(forum._id);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Topic"
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                          </span>
                          <button
                            onClick={() => handleViewReports(forum._id)}
                            className="view-reports-btn"
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "#ff9800",
                              color: "white",
                              border: "none",
                              borderRadius: "20px",
                              fontSize: "14px",
                              fontWeight: "500",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                              boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = "#e68900";
                              e.target.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = "#ff9800";
                              e.target.style.transform = "scale(1)";
                            }}
                          >
                            View Reports
                          </button>
                          {userId && forum.user_id && userId !== forum.user_id._id && (
                            <button
                              onClick={() => handleOpenBanModal(forum.user_id._id)}
                              className="ban-btn"
                              style={{
                                padding: "8px 16px",
                                backgroundColor: "#dc3545",
                                color: "white",
                                border: "none",
                                borderRadius: "20px",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#c82333";
                                e.target.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "#dc3545";
                                e.target.style.transform = "scale(1)";
                              }}
                            >
                              Ban User
                            </button>
                          )}
                        </div>
                      </div>
                      <h3
                        style={{
                          fontSize: "20px",
                          fontWeight: "600",
                          margin: "0 0 10px 0",
                          wordBreak: "break-word",
                        }}
                      >
                        {forum.title}
                      </h3>
                      <p
                        className="forum-description"
                        style={{
                          fontSize: "16px",
                          color: "#555",
                          lineHeight: "1.6",
                          marginBottom: "15px",
                        }}
                      >
                        {truncateDescription(forum.description, expanded[forum._id])}
                        {forum.description.length > 150 && (
                          <button
                            onClick={() => toggleDescription(forum._id)}
                            style={{
                              color: "#007bff",
                              fontSize: "14px",
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              marginLeft: "5px",
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
                          className="forum-photo mb-3"
                          style={{
                            width: "100%",
                            maxHeight: "200px",
                            objectFit: "cover",
                            borderRadius: "10px",
                          }}
                        />
                      )}
                      <div className="d-flex justify-content-between align-items-center">
                        <button
                          onClick={() => handleViewComments(forum._id)}
                          className="view-comments-btn"
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#28a745",
                            color: "white",
                            border: "none",
                            borderRadius: "20px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = "#218838";
                            e.target.style.transform = "scale(1.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = "#28a745";
                            e.target.style.transform = "scale(1)";
                          }}
                        >
                          <FontAwesomeIcon icon={faComment} className="me-2" />
                          View Comments ({commentsCountMap[forum._id] || 0})
                        </button>
                        <div className="text-muted" style={{ fontSize: "14px" }}>
                          <span>
                            <FontAwesomeIcon icon={faClock} className="me-1" />
                            {new Date(forum.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="ms-3">
                            Status:{" "}
                            <span
                              style={{
                                color: forum.status === "actif" ? "green" : "red",
                                fontWeight: "500",
                              }}
                            >
                              {forum.status}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: "center", fontSize: "18px", color: "#666" }}>
                  There are no topics here!
                </p>
              )}
            </div>

{totalPages > 1 && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      marginTop: "30px",
      gap: "10px",
    }}
  >
    <button className="theme-btn"
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      style={{
        padding: "8px 16px",
        borderRadius: "50px",
        border: "1px solid #007bff",
        backgroundColor: currentPage === 1 ? "#e0e0e0" : "white",
        color: currentPage === 1 ? "#666" : "#007bff",
        cursor: currentPage === 1 ? "not-allowed" : "pointer",
        transition: "all 0.3s ease",
        fontSize: "14px",
      }}
      onMouseEnter={(e) => {
        if (currentPage > 1) {
          e.currentTarget.style.backgroundColor = "#e6f0ff";
          e.currentTarget.style.color = "white";
        }
      }}
      onMouseLeave={(e) => {
        if (currentPage > 1) {
          e.currentTarget.style.backgroundColor = "white";
          e.currentTarget.style.color = "#007bff";
        }
      }}
    >
      Previous
    </button>
    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
      <button className="theme-btn"
        key={page}
        onClick={() => setCurrentPage(page)}
        style={{
          padding: "8px 14px",
          borderRadius: "50px",
          border: "1px solid #007bff",
          backgroundColor: currentPage === page ? "#007bff" : "white",
          color: currentPage === page ? "white" : "#007bff",
          cursor: "pointer",
          transition: "all 0.3s ease",
          fontSize: "14px",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          if (currentPage !== page) {
            e.currentTarget.style.backgroundColor = "#e6f0ff";
            e.currentTarget.style.color = "white";
          }
        }}
        onMouseLeave={(e) => {
          if (currentPage !== page) {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.color = "#007bff";
          }
        }}
      >
        {page}
      </button>
    ))}
    <button className="theme-btn"
      onClick={() =>
        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
      }
      disabled={currentPage === totalPages}
      style={{
        padding: "8px 16px",
        borderRadius: "50px",
        border: "1px solid #007bff",
        backgroundColor: currentPage === totalPages ? "#e0e0e0" : "white",
        color: currentPage === totalPages ? "#666" : "#007bff",
        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
        transition: "all 0.3s ease",
        fontSize: "14px",
      }}
      onMouseEnter={(e) => {
        if (currentPage < totalPages) {
          e.currentTarget.style.backgroundColor = "#e6f0ff";
          e.currentTarget.style.color = "white";
        }
      }}
      onMouseLeave={(e) => {
        if (currentPage < totalPages) {
          e.currentTarget.style.backgroundColor = "white";
          e.currentTarget.style.color = "#007bff";
        }
      }}
    >
      Next
    </button>
  </div>
)}
          </div>
        </div>
      </main>

      {/* Modal pour les signalements sur un topic */}
      {showReportsModal && (
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
              padding: "25px",
              borderRadius: "15px",
              width: "900px",
              maxWidth: "90%",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center", fontSize: "22px", fontWeight: "600" }}>
              Reports for this Topic
            </h3>
            <div
              style={{
                maxHeight: reports.length > 3 ? "400px" : "auto",
                overflowY: reports.length > 3 ? "auto" : "visible",
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
              }}
            >
              {reports.length > 0 ? (
                reports.map((report, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "15px",
                      borderBottom: "1px solid #eee",
                      backgroundColor: "white",
                      borderRadius: "10px",
                      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        flex: 1,
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        <img
                          src={`http://localhost:5000${report.user_id.user_photo}`}
                          alt="User Avatar"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #007bff",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "600", fontSize: "16px" }}>
                          {report.user_id.username}
                          <span
                            className="badge ms-3"
                            style={{
                              backgroundColor: "#e6f7ff",
                              color: "#007bff",
                              padding: "5px 10px",
                              borderRadius: "15px",
                              fontSize: "12px",
                            }}
                          >
                            {report.user_id.level} {report.user_id.speciality}
                          </span>
                        </p>
                        <p
                          style={{
                            margin: "5px 0 0 0",
                            wordBreak: "break-word",
                            color: "#333",
                            fontSize: "14px",
                          }}
                        >
                          Reason: {report.reason}
                        </p>
                        <p
                          style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#666" }}
                        >
                          Reported at: {new Date(report.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        className="icon"
                        style={{
                          cursor: "pointer",
                          fontSize: "18px",
                          color: "red",
                        }}
                        onClick={() => handleDeleteForumReport(report._id)}
                        title="Delete Report"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", fontSize: "16px", color: "#666" }}>
                  There are no reports for this topic!
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "15px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowReportsModal(false)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les commentaires */}
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
              padding: "25px",
              borderRadius: "15px",
              width: "900px",
              maxWidth: "90%",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center", fontSize: "22px", fontWeight: "600" }}>
              Comments
            </h3>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <button
                onClick={handleAnalyzeSentiment}
                disabled={isAnalyzing}
                style={{
                  padding: "10px 20px",
                  backgroundColor: isAnalyzing ? "#ccc" : "#800080",
                  color: "white",
                  border: "none",
                  borderRadius: "20px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: isAnalyzing ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
                }}
                onMouseEnter={(e) => {
                  if (!isAnalyzing) {
                    e.target.style.backgroundColor = "#660066";
                    e.target.style.transform = "scale(1.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isAnalyzing) {
                    e.target.style.backgroundColor = "#800080";
                    e.target.style.transform = "scale(1)";
                  }
                }}
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Sentiment"}
              </button>
            </div>
            <div
              style={{
                maxHeight: comments.length > 3 ? "400px" : "auto",
                overflowY: comments.length > 3 ? "auto" : "visible",
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
              }}
            >
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "15px",
                      borderBottom: "1px solid #eee",
                      backgroundColor: "white",
                      borderRadius: "10px",
                      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        flex: 1,
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        <img
                          src={`http://localhost:5000${comment.user_id.user_photo}`}
                          alt="User Avatar"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #007bff",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "600", fontSize: "16px" }}>
                          {comment.user_id.username}
                          <span
                            className="badge ms-3"
                            style={{
                              backgroundColor: "#e6f7ff",
                              color: "#007bff",
                              padding: "5px 10px",
                              borderRadius: "15px",
                              fontSize: "12px",
                            }}
                          >
                            {comment.user_id.level} {comment.user_id.speciality}
                          </span>
                          {commentSentiments[comment._id] && (
                            <span
                              className="badge ms-2"
                              style={{
                                backgroundColor:
                                  commentSentiments[comment._id] === "POSITIVE"
                                    ? "#e6ffe6"
                                    : commentSentiments[comment._id] === "NEGATIVE"
                                    ? "#ffe6e6"
                                    : "#f0f0f0",
                                color:
                                  commentSentiments[comment._id] === "POSITIVE"
                                    ? "#28a745"
                                    : commentSentiments[comment._id] === "NEGATIVE"
                                    ? "#dc3545"
                                    : "#6c757d",
                                padding: "5px 10px",
                                borderRadius: "15px",
                                fontSize: "12px",
                              }}
                            >
                              {commentSentiments[comment._id]}
                            </span>
                          )}
                        </p>
                        <p
                          style={{
                            margin: "5px 0 0 0",
                            wordBreak: "break-word",
                            color: "#333",
                            fontSize: "14px",
                          }}
                        >
                          {comment.content}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        className="icon"
                        style={{
                          cursor: "pointer",
                          fontSize: "18px",
                          color: "orange",
                        }}
                        onClick={() => handleViewCommentReports(comment._id)}
                        title="View Reports"
                      >
                        <FontAwesomeIcon icon={faFlag} />
                      </span>
                      <span
                        className="icon"
                        style={{
                          cursor: "pointer",
                          fontSize: "18px",
                          color: "red",
                        }}
                        onClick={() => {
                          setCommentToDelete(comment._id);
                          setShowDeleteCommentModal(true);
                        }}
                        title="Delete Comment"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </span>
                      {userId && comment.user_id && userId !== comment.user_id._id && (
                        <span
                          className="icon"
                          style={{
                            cursor: "pointer",
                            fontSize: "18px",
                            color: "purple",
                          }}
                          onClick={() => handleOpenBanModal(comment.user_id._id)}
                          title="Ban User"
                        >
                          <FontAwesomeIcon icon={faBan} />
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", fontSize: "16px", color: "#666" }}>
                  There is no comment here!
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "15px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowCommentModal(false)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour les signalements sur un commentaire */}
      {showCommentReportsModal && (
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
              padding: "25px",
              borderRadius: "15px",
              width: "900px",
              maxWidth: "90%",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center", fontSize: "22px", fontWeight: "600" }}>
              Reports for this Comment
            </h3>
            <div
              style={{
                maxHeight: commentReports.length > 3 ? "400px" : "auto",
                overflowY: commentReports.length > 3 ? "auto" : "visible",
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
              }}
            >
              {commentReports.length > 0 ? (
                commentReports.map((report, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "15px",
                      borderBottom: "1px solid #eee",
                      backgroundColor: "white",
                      borderRadius: "10px",
                      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                        flex: 1,
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        <img
                          src={`http://localhost:5000${report.user_id.user_photo}`}
                          alt="User Avatar"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #007bff",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "600", fontSize: "16px" }}>
                          {report.user_id.username}
                          <span
                            className="badge ms-3"
                            style={{
                              backgroundColor: "#e6f7ff",
                              color: "#007bff",
                              padding: "5px 10px",
                              borderRadius: "15px",
                              fontSize: "12px",
                            }}
                          >
                            {report.user_id.level} {report.user_id.speciality}
                          </span>
                        </p>
                        <p
                          style={{
                            margin: "5px 0 0 0",
                            wordBreak: "break-word",
                            color: "#333",
                            fontSize: "14px",
                          }}
                        >
                          Reason: {report.reason}
                        </p>
                        <p
                          style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#666" }}
                        >
                          Reported at: {new Date(report.createdAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        className="icon"
                        style={{
                          cursor: "pointer",
                          fontSize: "18px",
                          color: "red",
                        }}
                        onClick={() => handleDeleteCommentReport(report._id)}
                        title="Delete Report"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", fontSize: "16px", color: "#666" }}>
                  There are no reports for this comment!
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "15px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowCommentReportsModal(false)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour bannir un utilisateur */}
      {showBanModal && (
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
              padding: "25px",
              borderRadius: "15px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center", fontSize: "22px", fontWeight: "600" }}>
              Ban User
            </h3>
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="banDuration"
                style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}
              >
                Duration (in days):
              </label>
              <input
                type="number"
                id="banDuration"
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "25px",
                  border: "1px solid #ddd",
                  outline: "none",
                  fontSize: "14px",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
                }}
                placeholder="Enter duration in days"
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="banReason"
                style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}
              >
                Reason:
              </label>
              <select
                id="banReason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "25px",
                  border: "1px solid #ddd",
                  outline: "none",
                  fontSize: "14px",
                  boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
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
            <div
              style={{ display: "flex", justifyContent: "center", gap: "15px" }}
            >
              <button
                onClick={() => setShowBanModal(false)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBanUser}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour la liste des utilisateurs bannis */}
      {showBannedListModal && (
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
              padding: "25px",
              borderRadius: "15px",
              width: "600px",
              maxWidth: "90%",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center", fontSize: "22px", fontWeight: "600" }}>
              Banned Users List
            </h3>
            <div
              style={{
                maxHeight: bannedUsers.length > 3 ? "400px" : "auto",
                overflowY: bannedUsers.length > 3 ? "auto" : "visible",
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#f9f9f9",
                borderRadius: "10px",
              }}
            >
              {bannedUsers.length > 0 ? (
                bannedUsers.map((user, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "15px",
                      borderBottom: "1px solid #eee",
                      backgroundColor: "white",
                      borderRadius: "10px",
                      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", flex: 1, gap: "15px" }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        <img
                          src={`http://localhost:5000${user.user_id.user_photo}`}
                          alt="User Avatar"
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid #007bff",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: "600", fontSize: "16px" }}>
                          {user.user_id.username}
                        </p>
                        <p
                          style={{ margin: "5px 0 0 0", fontSize: "12px", color: "#666" }}
                        >
                          Reason: {user.reason} | Expires:{" "}
                          {new Date(user.expiresAt).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                      }}
                    >
                      <span
                        className="icon"
                        style={{
                          cursor: "pointer",
                          fontSize: "18px",
                          color: "#4CAF50",
                        }}
                        onClick={() => handleUnbanUser(user._id)}
                        title="Unban User"
                      >
                        <FontAwesomeIcon icon={faUserSlash} />
                      </span>
                      <img
                        src={generateQRCodeUrl(user)}
                        alt="QR Code for ban info"
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "5px",
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", fontSize: "16px", color: "#666" }}>
                  No banned users found!
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "15px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowBannedListModal(false)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour confirmer la suppression d'un topic */}
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
              padding: "25px",
              borderRadius: "15px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center", fontSize: "22px", fontWeight: "600" }}>
              Confirm Deletion
            </h3>
            <p style={{ marginBottom: "20px", textAlign: "center", fontSize: "16px", color: "#333" }}>
              Are you sure you want to delete this topic? This action cannot be undone.
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "15px" }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(forumToDelete)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour confirmer la suppression d'un commentaire */}
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
              padding: "25px",
              borderRadius: "15px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center", fontSize: "22px", fontWeight: "600" }}>
              Confirm Deletion
            </h3>
            <p style={{ marginBottom: "20px", textAlign: "center", fontSize: "16px", color: "#333" }}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "15px" }}
            >
              <button
                onClick={() => setShowDeleteCommentModal(false)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteComment(commentToDelete)}
                style={{
                  padding: "10px 25px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "25px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                  transition: "all 0.3s ease",
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