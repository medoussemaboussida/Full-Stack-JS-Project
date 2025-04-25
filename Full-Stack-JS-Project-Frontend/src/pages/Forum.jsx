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
  faSmile,
  faBell,
  faHeart,
} from "@fortawesome/free-regular-svg-icons";
import { faSearch, faThumbtack } from "@fortawesome/free-solid-svg-icons";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  addNotification,
} from "../utils/notificationUtils";

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
  const [isBanned, setIsBanned] = useState(false);
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
  const [showEmojiPicker, setShowEmojiPicker] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [username, setUsername] = useState(null);
  const [likedTopics, setLikedTopics] = useState(new Set());
  const [likedComments, setLikedComments] = useState(new Set());
  const [commentSentiments, setCommentSentiments] = useState({}); // Nouvel état pour les sentiments
  const [showChatbotModal, setShowChatbotModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showForumRulesModal, setShowForumRulesModal] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [showBanModal, setShowBanModal] = useState(false);
  const [banDetails, setBanDetails] = useState({ reason: "", expiresAt: "" });
  const navigate = useNavigate();
  // Fonction pour interagir avec l'API Gemini
  const interactWithGemini = async (message) => {
    const GEMINI_API_KEY = "AIzaSyCfw_jacNIo7ORhBYWXr9b6uYDeeOc4C7o"; // Remplacez par votre clé API réelle

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
          GEMINI_API_KEY,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: message,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        console.error("Erreur HTTP:", response.status, response.statusText);
        const errorData = await response.json();
        console.error("Détails de l'erreur:", errorData);
        return "Sorry, I couldn't process your request.";
      }

      const data = await response.json();
      const reply = data.candidates[0].content.parts[0].text;
      return reply;
    } catch (error) {
      console.error("Erreur lors de l'interaction avec Gemini:", error);
      return "An error occurred while interacting with the chatbot.";
    }
  };
  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(chatMessages));
  }, [chatMessages]);


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
  useEffect(() => {
    if (userId && comments.length > 0) {
      const liked = new Set(
        comments
          .filter((comment) =>
            comment.likes.some((id) => id.toString() === userId.toString())
          )
          .map((comment) => comment._id)
      );
      setLikedComments(liked);
    }
  }, [userId, comments]);
  // Fonction pour basculer l'affichage du sélecteur d'emojis
  const toggleEmojiPicker = (forumId) => {
    if (isBanned) {
      toast.error("You are banned and cannot perform this action!");
      return;
    }
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
      [forumId]: false,
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
        forum.tags &&
        forum.tags.some((tag) => tag.toLowerCase().includes(query));
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

  // Charger le token, l'ID utilisateur, le rôle, vérifier si l'utilisateur est banni et charger les notifications
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
          setUsername(null);
          setPinnedTopics(new Set());
          setLikedTopics(new Set());
          setIsBanned(false);
          setNotifications([]);
          return;
        }

        setToken(token);
        setUserId(decoded.id);
        setUserRole(decoded.role);
        setUsername(decoded.username);
        console.log("User role:", decoded.role);

        // Vérifier si l'utilisateur est banni
        const checkBanStatus = async () => {
          try {
            const response = await fetch(
              `http://localhost:5000/forum/checkBan/${decoded.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const data = await response.json();
            if (response.ok && data.isBanned) {
              const currentDate = new Date();
              const expiresAt = new Date(data.ban.expiresAt);
              if (expiresAt > currentDate) {
                setIsBanned(true);
                setBanDetails({
                  reason: data.ban.reason || "No reason provided",
                  expiresAt: expiresAt.toLocaleString("fr-FR"),
                });
                setShowBanModal(true); // Ouvre le modal automatiquement
              } else {
                setIsBanned(false);
                setShowBanModal(false);
              }
            } else {
              setIsBanned(false);
              setShowBanModal(false);
            }
          } catch (error) {
            console.error("Erreur lors de la vérification du ban:", error);
            setIsBanned(false);
          }
        };

        checkBanStatus();

        // Charger les notifications pour l'utilisateur
        const userNotifications = getNotifications(decoded.id);
        setNotifications(userNotifications);
      } catch (error) {
        console.error("Erreur de décodage du token:", error);
        localStorage.removeItem("jwt-token");
        setToken(null);
        setUserId(null);
        setUserRole(null);
        setUsername(null);
        setPinnedTopics(new Set());
        setLikedTopics(new Set());
        setIsBanned(false);
        setNotifications([]);
      }
    } else {
      console.log("Aucun token trouvé.");
      setToken(null);
      setUserId(null);
      setUserRole(null);
      setUsername(null);
      setPinnedTopics(new Set());
      setLikedTopics(new Set());
      setIsBanned(false);
      setNotifications([]);
    }
  }, [token]);

  // Charger les forums et initialiser pinnedTopics et likedTopics avec les données du backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const forumsResponse = await fetch(
          "http://localhost:5000/forum/getForum"
        );
        const forumsData = await forumsResponse.json();
        setForums(forumsData);

        // Initialiser pinnedTopics avec les forums épinglés par l'utilisateur
        if (userId) {
          const pinned = new Set(
            forumsData
              .filter((forum) =>
                forum.pinned.some((id) => id.toString() === userId.toString())
              )
              .map((forum) => forum._id)
          );
          setPinnedTopics(pinned);

          // Initialiser likedTopics avec les forums aimés par l'utilisateur
          const liked = new Set(
            forumsData
              .filter((forum) =>
                forum.likes.some((id) => id.toString() === userId.toString())
              )
              .map((forum) => forum._id)
          );
          setLikedTopics(liked);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };

    fetchData();
  }, [userId]);

  // Vérifier périodiquement les notifications pour des mises à jour
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      const updatedNotifications = getNotifications(userId);
      if (
        JSON.stringify(updatedNotifications) !== JSON.stringify(notifications)
      ) {
        setNotifications(updatedNotifications);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userId, notifications]);

  // Ajouter un commentaire à un forum
  const handleAddComment = async (forumId, content, anonymous) => {
    if (!userId) {
      console.log("User not authenticated.");
      return;
    }

    if (isBanned) {
      toast.error("You are banned and cannot add comments!");
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
        const forum = forums.find((f) => f._id === forumId);
        if (forum && forum.user_id && forum.user_id._id !== userId) {
          const creatorId = forum.user_id._id;
          const commenterName = anonymous ? "Anonymous" : username || "Someone";
          const message = `${commenterName} commented on your forum: "${forum.title}"`;
          addNotification(creatorId, message, "comment");
        }
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
    if (isBanned) {
      toast.error("You are banned and cannot delete comments!");
      return;
    }

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
    if (isBanned) {
      toast.error("You are banned and cannot view comments!");
      return;
    }

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
    if (isBanned) {
      toast.error("You are banned and cannot delete topics!");
      return;
    }

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
    if (isBanned) {
      toast.error("You are banned and cannot update topics!");
      return;
    }

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
    if (isBanned) {
      toast.error("You are banned and cannot update comments!");
      return;
    }

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
        console.error(
          "Erreur lors de la mise à jour du commentaire:",
          data.message
        );
        toast.error("Failed to update your comment!");
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
      toast.error("Failed to update your comment!");
    }
  };

  // Signaler un forum
  const handleReportForum = async () => {
    if (isBanned) {
      toast.error("You are banned and cannot report forums!");
      return;
    }

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
        const forum = forums.find((f) => f._id === forumToReport);
        if (forum && forum.user_id && forum.user_id._id !== userId) {
          const creatorId = forum.user_id._id;
          const reporterName = username || "Someone";
          const message = `${reporterName} reported your forum "${forum.title}" for: ${reportReason}`;
          addNotification(creatorId, message, "report_forum");
        }
      } else {
        toast.error("Failed to report forum: " + data.message);
      }
    } catch (error) {
      toast.error("Error reporting forum: " + error.message);
    }
  };

  // Signaler un commentaire
  const handleReportComment = async () => {
    if (isBanned) {
      toast.error("You are banned and cannot report comments!");
      return;
    }

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
        const comment = comments.find((c) => c._id === commentToReport);
        if (comment && comment.user_id && comment.user_id._id !== userId) {
          const authorId = comment.user_id._id;
          const reporterName = username || "Someone";
          const message = `${reporterName} reported your comment "${comment.content.substring(
            0,
            11
          )}..." for: ${commentReportReason}`;
          addNotification(authorId, message, "report_comment");
        }
      } else {
        toast.error("Failed to report comment: " + data.message);
      }
    } catch (error) {
      toast.error("Error reporting comment: " + error.message);
    }
  };

  // Fonction pour basculer l'état "pinned/unpinned" avec le backend
  const togglePin = useCallback(
    async (forumId) => {
      if (isBanned) {
        toast.error("You are banned and cannot pin topics!");
        return;
      }

      if (!userId || !token) {
        toast.error("You must be logged in to pin topics!");
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/forum/togglePinForum/${forumId}/${userId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setPinnedTopics((prevPinnedTopics) => {
            const newPinnedTopics = new Set(prevPinnedTopics);
            const isPinned = data.forum.pinned.some(
              (id) => id.toString() === userId.toString()
            );
            if (isPinned) {
              newPinnedTopics.add(forumId);
              toast.success("Topic pinned!", { toastId: `pin-${forumId}` });
            } else {
              newPinnedTopics.delete(forumId);
              toast.success("Topic unpinned!", { toastId: `pin-${forumId}` });
            }
            return newPinnedTopics;
          });

          // Mettre à jour les forums avec les nouvelles données du backend
          setForums((prevForums) =>
            prevForums.map((forum) =>
              forum._id === forumId
                ? { ...forum, pinned: data.forum.pinned }
                : forum
            )
          );
        } else {
          toast.error("Failed to toggle pin: " + data.message);
        }
      } catch (error) {
        console.error("Error toggling pin:", error);
        toast.error("Error toggling pin status!");
      }
    },
    [isBanned, userId, token]
  );

  // Fonction pour basculer l'état "liked/unliked" avec le backend
  const toggleLike = useCallback(
    async (forumId) => {
      if (isBanned) {
        toast.error("You are banned and cannot like topics!");
        return;
      }

      if (!userId || !token) {
        toast.error("You must be logged in to like topics!");
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/forum/toggleLikeForum/${forumId}/${userId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setLikedTopics((prevLikedTopics) => {
            const newLikedTopics = new Set(prevLikedTopics);
            const isLiked = data.forum.likes.some(
              (id) => id.toString() === userId.toString()
            );
            if (isLiked) {
              newLikedTopics.add(forumId);
              toast.success("Topic liked!", { toastId: `like-${forumId}` });
            } else {
              newLikedTopics.delete(forumId);
              toast.success("Topic unliked!", { toastId: `like-${forumId}` });
            }
            return newLikedTopics;
          });

          // Mettre à jour les forums avec les nouvelles données du backend
          setForums((prevForums) =>
            prevForums.map((forum) =>
              forum._id === forumId
                ? { ...forum, likes: data.forum.likes }
                : forum
            )
          );
        } else {
          toast.error("Failed to toggle like: " + data.message);
        }
      } catch (error) {
        console.error("Error toggling like:", error);
        toast.error("Error toggling like status!");
      }
    },
    [isBanned, userId, token]
  );
  const toggleLikeComment = useCallback(
    async (commentId) => {
      if (isBanned) {
        toast.error("You are banned and cannot like comments!");
        return;
      }

      if (!userId || !token) {
        toast.error("You must be logged in to like comments!");
        return;
      }

      try {
        const response = await fetch(
          `http://localhost:5000/forumComment/toggleLikeComment/${commentId}/${userId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.ok) {
          setLikedComments((prevLikedComments) => {
            const newLikedComments = new Set(prevLikedComments);
            const isLiked = data.comment.likes.some(
              (id) => id.toString() === userId.toString()
            );
            if (isLiked) {
              newLikedComments.add(commentId);
              toast.success("Comment liked!", {
                toastId: `like-comment-${commentId}`,
              });
            } else {
              newLikedComments.delete(commentId);
              toast.success("Comment unliked!", {
                toastId: `like-comment-${commentId}`,
              });
            }
            return newLikedComments;
          });

          // Mettre à jour les commentaires avec les nouvelles données du backend
          setComments((prevComments) =>
            prevComments.map((comment) =>
              comment._id === commentId
                ? { ...comment, likes: data.comment.likes }
                : comment
            )
          );
        } else {
          toast.error("Failed to toggle like: " + data.message);
        }
      } catch (error) {
        console.error("Error toggling like:", error);
        toast.error("Error toggling like status!");
      }
    },
    [isBanned, userId, token]
  );
  // Calculer le nombre de notifications non lues
  const unreadNotificationsCount = notifications.filter(
    (notif) => !notif.read
  ).length;

  // Fonction pour ouvrir le modal des notifications
  const handleOpenNotifications = () => {
    setShowNotificationsModal(true);
  };

  // Fonction pour marquer une notification comme lue
  const handleMarkAsRead = (notificationId) => {
    markNotificationAsRead(userId, notificationId);
    setNotifications(getNotifications(userId));
  };

  // Fonction pour marquer toutes les notifications comme lues
  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead(userId);
    setNotifications(getNotifications(userId));
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
                  width: isSearchOpen ? "250px" : "40px", // Réduit de 400px à 250px
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
                        width: isSearchOpen ? "80%" : "0%",
                        boxSizing: "border-box",
                        opacity: isSearchOpen ? 1 : 0,
                        transition: "opacity 0.10s ease, width 0.10s ease",
                        visibility: isSearchOpen ? "visible" : "hidden",
                      }}
                    />
                  </>
                )}
              </div>
              <div
                style={{
                  position: "fixed",
                  bottom: "18px",
                  left: "20px",
                  zIndex: 1000,
                  cursor: "pointer",
                }}
                onClick={() => setShowForumRulesModal(true)}
              >
                <div
                  style={{
                    backgroundColor: "#ff9800", // Orange pour se démarquer
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
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  <span style={{ fontSize: "24px", color: "white" }}>❓</span>
                </div>
              </div>
              {/* Conteneur pour la liste déroulante et les boutons */}
              <div className="d-flex align-items-center">
                {/* Liste déroulante à gauche */}
                <select
                  value={sortOption}
                  onChange={(e) => {
                    if (isBanned) {
                      toast.error("You are banned and cannot sort topics!");
                      return;
                    }
                    setSortOption(e.target.value);
                  }}
                  style={{
                    padding: "10px",
                    borderRadius: "50px",
                    border: "1px solid #007bff",
                    outline: "none",
                    cursor: isBanned ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    marginRight: "10px",
                    width: "200px",
                    opacity: isBanned ? 0.5 : 1,
                  }}
                  disabled={isBanned}
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
                    opacity: isBanned ? 0.5 : 1,
                    cursor: isBanned ? "not-allowed" : "pointer",
                  }}
                  onClick={() => {
                    if (isBanned) {
                      toast.error("You are banned and cannot add new topics!");
                      return;
                    }
                    navigate("/addforum");
                  }}
                  disabled={isBanned}
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
                      opacity: isBanned ? 0.5 : 1,
                      cursor: isBanned ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (isBanned) {
                        toast.error(
                          "You are banned and cannot moderate forums!"
                        );
                        return;
                      }
                      navigate("/moderateForum");
                    }}
                    disabled={isBanned}
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
                    style={{
                      opacity: forum.status === "inactif" ? 0.5 : 1,
                      filter:
                        forum.status === "inactif" ? "grayscale(50%)" : "none",
                    }}
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
                                  cursor: isBanned ? "not-allowed" : "pointer",
                                  fontSize: "20px",
                                  color: "#007bff",
                                  marginRight: "15px",
                                  opacity: isBanned ? 0.5 : 1,
                                }}
                                onClick={() => {
                                  if (isBanned) {
                                    toast.error(
                                      "You are banned and cannot edit topics!"
                                    );
                                    return;
                                  }
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
                                  cursor: isBanned ? "not-allowed" : "pointer",
                                  fontSize: "20px",
                                  color: "red",
                                  marginRight: "15px",
                                  opacity: isBanned ? 0.5 : 1,
                                }}
                                onClick={() => {
                                  if (isBanned) {
                                    toast.error(
                                      "You are banned and cannot delete topics!"
                                    );
                                    return;
                                  }
                                  setForumToDelete(forum._id);
                                  setShowDeleteModal(true);
                                }}
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </span>
                            </>
                          )}
                        {userId && forum.status === "actif" && (
                          <span
                            className="icon"
                            style={{
                              cursor: isBanned ? "not-allowed" : "pointer",
                              fontSize: "20px",
                              color: "orange",
                              marginRight: "15px",
                              opacity: isBanned ? 0.5 : 1,
                            }}
                            onClick={() => {
                              if (isBanned) {
                                toast.error(
                                  "You are banned and cannot report forums!"
                                );
                                return;
                              }
                              setForumToReport(forum._id);
                              setShowReportForumModal(true);
                            }}
                          >
                            <FontAwesomeIcon icon={faFlag} />
                          </span>
                        )}
                        {userId && forum.status === "actif" && (
                          <span
                            className="icon"
                            style={{
                              cursor: isBanned ? "not-allowed" : "pointer",
                              fontSize: "20px",
                              color: forum.pinned.some(
                                (id) => id.toString() === userId?.toString()
                              )
                                ? "#007bff"
                                : "gray",
                              transform: forum.pinned.some(
                                (id) => id.toString() === userId?.toString()
                              )
                                ? "rotate(-45deg)"
                                : "none",
                              transition: "transform 0.3s ease",
                              opacity: isBanned ? 0.5 : 1,
                              marginRight: "15px",
                            }}
                            onClick={() => togglePin(forum._id)}
                          >
                            <FontAwesomeIcon icon={faThumbtack} />
                          </span>
                        )}
                        {userId && forum.status === "actif" && (
                          <div className="d-flex align-items-center">
                            <span
                              className="icon"
                              style={{
                                cursor: isBanned ? "not-allowed" : "pointer",
                                fontSize: "20px",
                                color: likedTopics.has(forum._id)
                                  ? "red"
                                  : "gray",
                                opacity: isBanned ? 0.5 : 1,
                                marginRight: "5px",
                              }}
                              onClick={() => toggleLike(forum._id)}
                            >
                              <FontAwesomeIcon icon={faHeart} />
                            </span>
                            <span
                              style={{
                                fontSize: "12px",
                                color: "black",
                                marginTop: "5px",
                              }}
                            >
                              {forum.likes.length}
                            </span>
                          </div>
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
                    {forum.status === "inactif" ? (
                      <div
                        className="mt-3 text-muted"
                        style={{ fontSize: "14px", color: "red" }}
                      >
                        <p style={{ margin: 0, fontStyle: "italic" }}>
                          This topic is inactive for now.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="d-flex align-items-center mt-2 position-relative">
                          <input
                            type="text"
                            placeholder="Type your comment..."
                            className="form-control rounded-pill me-2"
                            style={{
                              border: "1px solid #007bff",
                              paddingLeft: "10px",
                              fontSize: "14px",
                              maxWidth: "65%",
                              paddingRight: "40px",
                              opacity: isBanned ? 0.5 : 1,
                            }}
                            value={comment[forum._id] || ""}
                            onChange={(e) =>
                              setComment((prev) => ({
                                ...prev,
                                [forum._id]: e.target.value,
                              }))
                            }
                            disabled={isBanned}
                          />
                          <FontAwesomeIcon
                            icon={faSmile}
                            style={{
                              position: "absolute",
                              left: "440px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: "18px",
                              color: "#007bff",
                              cursor: isBanned ? "not-allowed" : "pointer",
                              opacity: isBanned ? 0.5 : 1,
                            }}
                            onClick={() => toggleEmojiPicker(forum._id)}
                          />
                          {showEmojiPicker[forum._id] && !isBanned && (
                            <div
                              style={{
                                position: "absolute",
                                zIndex: 1000,
                                bottom: "50px",
                                right: "0",
                              }}
                            >
                              <EmojiPicker
                                onEmojiClick={(emojiObject) =>
                                  onEmojiClick(forum._id, emojiObject)
                                }
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
                            className="theme-btn"
                            style={{
                              backgroundColor: "#28a745", // Vert pour "Send Comment"
                              color: "white",
                              borderRadius: "50px",
                              border: "none",
                              fontSize: "14px",
                              opacity: isBanned ? 0.5 : 1,
                              cursor: isBanned ? "not-allowed" : "pointer",
                              transition: "background-color 0.3s ease, transform 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isBanned) {
                                e.currentTarget.style.backgroundColor = "#218838";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isBanned) {
                                e.currentTarget.style.backgroundColor = "#28a745";
                                e.currentTarget.style.transform = "scale(1)";
                              }
                            }}
                            disabled={isBanned}
                          >
                            Send
                          </button>&nbsp;
                          <button
                            onClick={() => handleViewComments(forum._id)}
                            className="theme-btn"
                            style={{
                              backgroundColor: "#007bff", // Bleu pour "View Comments"
                              color: "white",
                              borderRadius: "50px",
                              border: "none",
                              fontSize: "14px",
                              opacity: isBanned ? 0.5 : 1,
                              cursor: isBanned ? "not-allowed" : "pointer",
                              transition: "background-color 0.3s ease, transform 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!isBanned) {
                                e.currentTarget.style.backgroundColor = "#0056b3";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isBanned) {
                                e.currentTarget.style.backgroundColor = "#007bff";
                                e.currentTarget.style.transform = "scale(1)";
                              }
                            }}
                            disabled={isBanned}
                          >
                            View Comments
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
                              cursor: isBanned ? "not-allowed" : "pointer",
                              marginRight: "10px",
                              transition: "background-color 0.3s ease",
                              backgroundColor: anonymous
                                ? "rgba(0, 128, 0, 0.2)"
                                : "white",
                              opacity: isBanned ? 0.5 : 1,
                            }}
                            onClick={() => {
                              if (isBanned) {
                                toast.error(
                                  "You are banned and cannot perform this action!"
                                );
                                return;
                              }
                              setAnonymous(!anonymous);
                            }}
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
                              cursor: isBanned ? "not-allowed" : "pointer",
                              opacity: isBanned ? 0.5 : 1,
                            }}
                            onClick={() => {
                              if (isBanned) {
                                toast.error(
                                  "You are banned and cannot perform this action!"
                                );
                                return;
                              }
                              setAnonymous(!anonymous);
                            }}
                          >
                            Anonymous comment ?
                          </label>
                        </div>
                      </>
                    )}
                    <div
                      className="mt-3 text-muted"
                      style={{ fontSize: "14px" }}
                    >
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

      {/* Bulle de notification flottante */}
      {token && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "100px",
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
                  top: "-7px",
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

      {/* Modal pour les notifications */}
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
                      <div style={{ flexShrink: "0" }}>
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
                            {commentSentiments[comment._id] && (
                              <span
                                className="badge"
                                style={{
                                  marginLeft: "10px",
                                  backgroundColor:
                                    commentSentiments[comment._id] ===
                                    "POSITIVE"
                                      ? "green"
                                      : commentSentiments[comment._id] ===
                                        "NEGATIVE"
                                      ? "red"
                                      : "gray",
                                  color: "white",
                                  padding: "2px 8px",
                                  borderRadius: "20px",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {commentSentiments[comment._id]}
                              </span>
                            )}
                          </p>
                        ) : (
                          <p style={{ margin: 0, fontWeight: "bold" }}>
                            {comment.user_id.username} &nbsp;
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
                              {comment.user_id.level}{" "}
                              {comment.user_id.speciality}
                            </span>
                            {commentSentiments[comment._id] && (
                              <span
                                className="badge"
                                style={{
                                  marginLeft: "10px",
                                  backgroundColor: "transparent",
                                  border: `1px solid ${
                                    commentSentiments[comment._id] ===
                                    "POSITIVE"
                                      ? "#28a745" // Vert pour POSITIVE
                                      : commentSentiments[comment._id] ===
                                        "NEGATIVE"
                                      ? "#dc3545" // Rouge pour NEGATIVE
                                      : "#6c757d" // Gris pour NEUTRAL
                                  }`,
                                  color: `${
                                    commentSentiments[comment._id] ===
                                    "POSITIVE"
                                      ? "#28a745"
                                      : commentSentiments[comment._id] ===
                                        "NEGATIVE"
                                      ? "#dc3545"
                                      : "#6c757d"
                                  }`,
                                  padding: "2px 8px",
                                  borderRadius: "20px",
                                  boxShadow: `0 0 10px ${
                                    commentSentiments[comment._id] ===
                                    "POSITIVE"
                                      ? "rgba(40, 167, 69, 0.5)" // Lueur verte
                                      : commentSentiments[comment._id] ===
                                        "NEGATIVE"
                                      ? "rgba(220, 53, 69, 0.5)" // Lueur rouge
                                      : "rgba(108, 117, 125, 0.5)" // Lueur grise
                                  }`,
                                  fontSize: "0.875rem",
                                }}
                              >
                                {commentSentiments[comment._id]}
                              </span>
                            )}
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
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      {userId === comment.user_id._id && (
                        <span
                          className="icon"
                          style={{
                            cursor: isBanned ? "not-allowed" : "pointer",
                            fontSize: "18px",
                            color: "#007bff",
                            opacity: isBanned ? 0.5 : 1,
                          }}
                          onClick={() => {
                            if (isBanned) {
                              toast.error(
                                "You are banned and cannot edit comments!"
                              );
                              return;
                            }
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
                          style={{
                            cursor: isBanned ? "not-allowed" : "pointer",
                            fontSize: "18px",
                            color: "red",
                            opacity: isBanned ? 0.5 : 1,
                          }}
                          onClick={() => {
                            if (isBanned) {
                              toast.error(
                                "You are banned and cannot delete comments!"
                              );
                              return;
                            }
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
                          style={{
                            cursor: isBanned ? "not-allowed" : "pointer",
                            fontSize: "18px",
                            color: "orange",
                            opacity: isBanned ? 0.5 : 1,
                          }}
                          onClick={() => {
                            if (isBanned) {
                              toast.error(
                                "You are banned and cannot report comments!"
                              );
                              return;
                            }
                            setCommentToReport(comment._id);
                            setShowReportCommentModal(true);
                          }}
                        >
                          <FontAwesomeIcon icon={faFlag} />
                        </span>
                      )}
                      {userId && (
                        <div className="d-flex align-items-center">
                          <span
                            className="icon"
                            style={{
                              cursor: isBanned ? "not-allowed" : "pointer",
                              fontSize: "18px",
                              color: likedComments.has(comment._id)
                                ? "red"
                                : "gray",
                              opacity: isBanned ? 0.5 : 1,
                              marginRight: "5px",
                            }}
                            onClick={() => toggleLikeComment(comment._id)}
                          >
                            <FontAwesomeIcon icon={faHeart} />
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "black",
                            }}
                          >
                            {comment.likes.length}
                          </span>
                        </div>
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
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
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
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
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
                <option value="inappropriate_content">
                  Inappropriate Content
                </option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="offensive_language">Offensive Language</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
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
                <option value="inappropriate_content">
                  Inappropriate Content
                </option>
                <option value="spam">Spam</option>
                <option value="harassment">Harassment</option>
                <option value="offensive_language">Offensive Language</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
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

      {/* Bouton flottant pour ouvrir le modal du chatbot */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "30px",
          zIndex: 1000,
          cursor: "pointer",
        }}
        onClick={() => setShowChatbotModal(true)}
      >
        <div
          style={{
            backgroundColor: "#28a745",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
            transition: "transform 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span style={{ fontSize: "24px", color: "white" }}>🤖</span>
        </div>
      </div>

      {/* Modal du chatbot */}
      {showChatbotModal && (
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
              display: "flex",
              flexDirection: "column",
              maxHeight: "80vh",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Chatbot (Gemini)
            </h3>
            <div
              style={{
                flex: 1,
                maxHeight: "60vh",
                overflowY: "auto",
                marginBottom: "20px",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "8px",
              }}
            >
              {chatMessages.length > 0 ? (
                chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "10px",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor:
                        msg.sender === "user" ? "#e6f3ff" : "#f9f9f9",
                      alignSelf:
                        msg.sender === "user" ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      wordBreak: "break-word",
                    }}
                  >
                    <strong>{msg.sender === "user" ? "You" : "Bot"}:</strong>{" "}
                    {msg.text}
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#666" }}>
                  Start a conversation with the chatbot!
                </p>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Type your message..."
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                  outline: "none",
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && userMessage.trim()) {
                    setChatMessages((prev) => [
                      ...prev,
                      { sender: "user", text: userMessage },
                    ]);
                    interactWithGemini(userMessage).then((reply) => {
                      setChatMessages((prev) => [
                        ...prev,
                        { sender: "bot", text: reply },
                      ]);
                    });
                    setUserMessage("");
                  }
                }}
              />
              <button
                onClick={() => {
                  if (userMessage.trim()) {
                    setChatMessages((prev) => [
                      ...prev,
                      { sender: "user", text: userMessage },
                    ]);
                    interactWithGemini(userMessage).then((reply) => {
                      setChatMessages((prev) => [
                        ...prev,
                        { sender: "bot", text: reply },
                      ]);
                    });
                    setUserMessage("");
                  }
                }}
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
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => {
                  setShowChatbotModal(false);
                  setUserMessage(""); // On réinitialise uniquement le champ de saisie
                  // On ne réinitialise plus chatMessages pour conserver la discussion
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
                Close
              </button>
              <button
                onClick={() => {
                  setChatMessages([]);
                  localStorage.removeItem("chatMessages");
                }}
                style={{
                  backgroundColor: "#ff9800",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                  marginLeft: "10px",
                }}
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
      {showForumRulesModal && (
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
              Forum Rules 📜
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
                <span role="img" aria-label="handshake">
                  🤝
                </span>{" "}
                Respect the chat – Be kind and considerate to others.
              </li>
              <li style={{ marginBottom: "10px" }}>
                <span role="img" aria-label="warning">
                  ⚠️
                </span>{" "}
                Inappropriate behavior will result in a ban.
              </li>
              <li style={{ marginBottom: "10px" }}>
                <span role="img" aria-label="flag">
                  🚩
                </span>{" "}
                You can report any comment or topic if it violates the rules.
              </li>
              <li style={{ marginBottom: "10px" }}>
                <span role="img" aria-label="robot">
                  🤖
                </span>{" "}
                Use the chatbot Gemini to help you add topics or find
                information.
              </li>
              <li>
                <span role="img" aria-label="smile">
                  😊
                </span>{" "}
                Keep the community positive and supportive!
              </li>
            </ul>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setShowForumRulesModal(false)}
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
              padding: "20px",
              borderRadius: "8px",
              width: "500px",
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: "20px", color: "#dc3545" }}>
              You Are Banned 🚫
            </h3>
            <p
              style={{ marginBottom: "10px", fontSize: "16px", color: "#333" }}
            >
              <strong>you can't do any action for now !</strong>
            </p>
            <p
              style={{ marginBottom: "10px", fontSize: "16px", color: "#333" }}
            >
              <strong>Reason:</strong> {banDetails.reason}
            </p>
            <p
              style={{ marginBottom: "20px", fontSize: "16px", color: "#333" }}
            >
              <strong>Ban Expires:</strong> {banDetails.expiresAt}
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => setShowBanModal(false)}
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

export default Forum;
