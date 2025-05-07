import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import { QRCodeCanvas } from "qrcode.react";
import EmojiPicker from "emoji-picker-react";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

const BASE_URL = "http://localhost:5000";

const isValidJwt = (token) => {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 3;
};

const Countdown = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target - now;

      if (isNaN(target.getTime())) {
        setTimeLeft({ days: "N/A", hours: "N/A", minutes: "N/A", seconds: "N/A" });
        return;
      }

      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="coming-countdown" style={{ display: "flex", gap: "20px", justifyContent: "center", fontSize: "24px", color: "#ff7f5d", fontWeight: "bold" }}>
      <span>{timeLeft.days ?? "N/A"} Days</span>
      <span>{timeLeft.hours ?? "N/A"} Hours</span>
      <span>{timeLeft.minutes ?? "N/A"} Minutes</span>
      <span>{timeLeft.seconds ?? "N/A"} Seconds</span>
    </div>
  );
};

const QRCodeModal = ({ isOpen, onClose, qrCodeValue, eventTitle, isPartner, ticketDetails }) => {
  if (!isOpen) return null;

  const formattedTicketDetails = `Ticket Details:
🎟️ Event Ticket 🎟️
Event: ${ticketDetails.eventTitle}
Type: ${ticketDetails.participationType}
User ID: ${ticketDetails.userId}
Date: ${ticketDetails.startDate} to ${ticketDetails.endDate}
Time: ${ticketDetails.time || "N/A"}
Location: ${ticketDetails.location || "N/A"}
${ticketDetails.onlineLink ? `Online Link: ${ticketDetails.onlineLink}` : ""}`.trim();

  console.log("QRCodeModal props:", { qrCodeValue, eventTitle, isPartner, ticketDetails });

  return (
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
        zIndex: 10000,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "10px",
          textAlign: "center",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
        }}
      >
        <h3>{isPartner ? "Partner" : "Participation"} Ticket</h3>
        <p>Scan this QR code to view your ticket for: <strong>{eventTitle}</strong></p>
        <QRCodeCanvas value={qrCodeValue} size={300} />
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#ff7f5d",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "25px",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.3s ease",
            }}
            onMouseEnter={(e) => (e.target.style.backgroundColor = "#ff5733")}
            onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff7f5d")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const StoryModal = ({ isOpen, onClose, story, userId, onLike, onReply, onEmojiSelect, replies, replyText, setReplyText, showEmojiPicker, setShowEmojiPicker }) => {
  if (!isOpen || !story) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10001,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "30px",
          borderRadius: "20px",
          textAlign: "center",
          maxWidth: "800px",
          width: "95%",
          boxShadow: "0 6px 25px rgba(0, 0, 0, 0.3)",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            backgroundColor: "#ff7f5d",
            color: "#fff",
            width: "35px",
            height: "35px",
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background-color 0.3s ease",
          }}
          onMouseEnter={(e) => (e.target.style.backgroundColor = "#ff5733")}
          onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff7f5d")}
        >
          <i className="fas fa-times"></i>
        </button>
        <img
          src={story.url}
          alt={`Story by ${story.username || "Unknown"}`}
          style={{
            width: "100%",
            maxHeight: "600px",
            objectFit: "contain",
            borderRadius: "15px",
            marginBottom: "20px",
          }}
        />
        <p style={{ fontSize: "18px", color: "#333", fontWeight: "500", marginBottom: "15px" }}>
          Posted by: <strong>{story.username || "Anonymous"}</strong>
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "20px" }}>
          <button
            onClick={() => onLike(story._id)}
            style={{
              backgroundColor: story.likedBy?.includes(userId) ? "#ff0000" : "#e9ecef",
              color: story.likedBy?.includes(userId) ? "#fff" : "#333",
              padding: "10px 20px",
              borderRadius: "25px",
              border: "none",
              transition: "background-color 0.3s ease",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <i className="fas fa-heart"></i> {story.likes || 0}
          </button>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{
              backgroundColor: "#e9ecef",
              color: "#333",
              padding: "10px 20px",
              borderRadius: "25px",
              border: "none",
              cursor: "pointer",
            }}
          >
            <i className="fas fa-smile"></i>
          </button>
        </div>
        {showEmojiPicker && (
          <div style={{ position: "absolute", zIndex: 10002 }}>
            <EmojiPicker
              onEmojiClick={(emojiObject) => {
                onEmojiSelect(story._id, emojiObject.emoji);
                setShowEmojiPicker(false);
              }}
            />
          </div>
        )}
        <div style={{ marginBottom: "20px" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onReply(story._id, { text: replyText });
            }}
            style={{ display: "flex", alignItems: "center", gap: "15px", justifyContent: "center" }}
          >
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply to this story..."
              style={{
                width: "70%",
                padding: "12px",
                borderRadius: "25px",
                border: "1px solid #ccc",
                outline: "none",
                fontSize: "16px",
              }}
            />
            <button
              type="submit"
              disabled={!replyText.trim()}
              style={{
                backgroundColor: replyText.trim() ? "#ff7f5d" : "#ccc",
                color: "#fff",
                padding: "12px 20px",
                borderRadius: "25px",
                border: "none",
                cursor: replyText.trim() ? "pointer" : "not-allowed",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => {
                if (replyText.trim()) e.target.style.backgroundColor = "#ff5733";
              }}
              onMouseLeave={(e) => {
                if (replyText.trim()) e.target.style.backgroundColor = "#ff7f5d";
              }}
            >
              Send
            </button>
          </form>
        </div>
        <div style={{ textAlign: "left", maxHeight: "200px", overflowY: "auto", padding: "0 15px" }}>
          {replies.length > 0 ? (
            replies.map((reply, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "15px",
                  padding: "8px",
                  backgroundColor: "#f9f9f9",
                  borderRadius: "15px",
                }}
              >
                <span style={{ fontWeight: "bold", fontSize: "16px", color: "#333" }}>
                  {reply.username || "Anonymous"}:
                </span>
                <span style={{ fontSize: "16px", color: "#666" }}>{reply.text || ""}</span>
                {reply.emoji && <span style={{ fontSize: "18px" }}>{reply.emoji}</span>}
              </div>
            ))
          ) : (
            <p style={{ color: "#666", fontSize: "16px", textAlign: "center" }}>
              No replies yet.
            </p>
          )}
          {story.likedBy && story.likedBy.length > 0 && (
            <div style={{ marginTop: "15px", padding: "8px", backgroundColor: "#f0f0f0", borderRadius: "15px" }}>
              <span style={{ fontWeight: "bold", fontSize: "16px", color: "#333" }}>Likes by:</span>
              {story.likedBy.map((user, idx) => (
                <span key={idx} style={{ fontSize: "16px", color: "#666", marginLeft: "5px" }}>
                  {user.username || `Anonymous${idx + 1}`}{idx < story.likedBy.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearestEvent, setNearestEvent] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");
  const [filterEventType, setFilterEventType] = useState("all");
  const [sortOrder, setSortOrder] = useState("title-asc");
  const [isParticipatingNearest, setIsParticipatingNearest] = useState(false);
  const [participationStatus, setParticipationStatus] = useState({});
  const [partnerStatus, setPartnerStatus] = useState({});
  const [isSubmitting, setIsSubmitting] = useState({});
  const [likes, setLikes] = useState({});
  const [dislikes, setDislikes] = useState({});
  const [favorites, setFavorites] = useState({});
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [qrCodeValue, setQRCodeValue] = useState("");
  const [qrCodeEventTitle, setQRCodeEventTitle] = useState("");
  const [isPartnerQR, setIsPartnerQR] = useState(false);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [storyImages, setStoryImages] = useState([]);
  const [storyFile, setStoryFile] = useState(null);
  const [selectedStory, setSelectedStory] = useState(null);
  const [storyReplies, setStoryReplies] = useState({});
  const [replyText, setReplyText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [error, setError] = useState(null);
  const eventsPerPage = 6;

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token && isValidJwt(token)) {
      try {
        const decoded = jwtDecode(token);
        setUserRole(decoded.role);
        setUserId(decoded.id);
      } catch (error) {
        console.error("Failed to decode JWT for role:", error.message);
        setUserRole(null);
        setUserId(null);
        localStorage.removeItem("jwt-token");
        toast.error("Invalid session. Please log in again.");
        setTimeout(() => navigate("/login"), 2000);
      }
    }
  }, [navigate]);

  const checkParticipation = async (eventId, setStatusCallback) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !isValidJwt(token)) return;

      const response = await axios.get(`${BASE_URL}/events/checkParticipation/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Checked participation for event ${eventId}:`, response.data);
      setStatusCallback(response.data.isParticipating);
    } catch (error) {
      console.error("Error checking participation:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  };

  const checkPartnerStatus = async (eventId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !isValidJwt(token)) return false;

      const response = await axios.get(`${BASE_URL}/events/checkPartnerParticipation/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Checked partner status for event ${eventId}:`, response.data);
      setPartnerStatus((prev) => ({ ...prev, [eventId]: response.data.isPartner }));
      return response.data.isPartner;
    } catch (error) {
      console.error("Error checking partner status:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return false;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Invalid Date"
      : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const fetchStories = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      const headers = token && isValidJwt(token) ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(`${BASE_URL}/events/stories`, { headers });
      console.log("Stories fetched:", response.data);
      setStoryImages(response.data.map(story => ({
        _id: story._id,
        url: `${BASE_URL}${story.imageUrl}`,
        username: story.userId?.username || "Anonymous",
        userId: story.userId?._id || null,
        likes: story.likes || 0,
        likedBy: story.likedBy?.map(user => ({
          userId: user._id || user.userId,
          username: user.username || "Anonymous"
        })) || [],
      })));
    } catch (error) {
      console.error("Error fetching stories:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("jwt-token");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        toast.error(error.response?.data?.message || "Failed to load stories");
      }
    }
  };

  const fetchReplies = async (storyId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !isValidJwt(token)) return;

      const response = await axios.get(`${BASE_URL}/events/stories/replies/${storyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Replies fetched for story", storyId, ":", response.data);
      setStoryReplies((prev) => ({
        ...prev,
        [storyId]: response.data.map(reply => ({
          ...reply,
          username: reply.userId?.username || "Anonymous",
          userId: reply.userId?._id || reply.userId,
        }))
      }));
    } catch (error) {
      console.error("Error fetching replies:", error);
      toast.error("Failed to load replies. Please try again later.");
      setStoryReplies((prev) => ({ ...prev, [storyId]: [] }));
    }
  };

  const handleLikeStory = async (storyId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        setError("Please log in to like a story.");
        return;
      }

      const response = await axios.post(`${BASE_URL}/events/stories/like/${storyId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStoryImages(prevStories =>
        prevStories.map(story =>
          story._id === storyId ? {
            ...story,
            likes: response.data.likes,
            likedBy: response.data.likedBy.map(user => ({
              userId: user._id || user.userId,
              username: user.username || "Anonymous"
            }))
          } : story
        )
      );
    } catch (error) {
      console.error("Error liking story:", error);
      if (error.response?.status === 400) {
        setError("Invalid request. Please try again.");
      } else if (error.response?.status === 403) {
        setError("Authentication failed. Please log in again.");
      } else {
        setError("Failed to like story. Please try again.");
      }
    }
  };

  const handleReplyStory = async (storyId, replyData) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        setError("Please log in to reply.");
        return;
      }

      const response = await axios.post(`${BASE_URL}/events/stories/replies/${storyId}`, replyData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newReply = {
        ...response.data,
        username: response.data.userId?.username || "Anonymous",
        userId: response.data.userId?._id || response.data.userId,
      };
      setStoryReplies(prev => ({
        ...prev,
        [storyId]: [...(prev[storyId] || []), newReply]
      }));
      setReplyText("");
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Error replying to story:", error);
      setError("Failed to submit reply. Please try again.");
    }
  };

  const handleEmojiSelect = async (storyId, emoji) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        setError("Please log in to send an emoji.");
        return;
      }

      const response = await axios.post(`${BASE_URL}/events/stories/replies/${storyId}`, { emoji }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const newReply = {
        ...response.data,
        username: response.data.userId?.username || "Anonymous",
        userId: response.data.userId?._id || response.data.userId,
      };
      setStoryReplies(prev => ({
        ...prev,
        [storyId]: [...(prev[storyId] || []), newReply]
      }));
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Error sending emoji:", error);
      setError("Failed to send emoji. Please try again.");
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) {
      toast.error("Please select an image to upload");
      return;
    }

    const token = localStorage.getItem("jwt-token");
    if (!token || !isValidJwt(token)) {
      toast.error("Please log in to upload a story");
      navigate("/login");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(`${BASE_URL}/events/stories/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Story uploaded successfully!");
      setStoryFile(null);
      fetchStories();
    } catch (error) {
      console.error("Error uploading story:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(error.response?.data?.message || "Failed to upload story");
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log("Fetching events from:", `${BASE_URL}/events/getEvents`);
        const response = await axios.get(`${BASE_URL}/events/getEvents`, {
          headers: { "Content-Type": "application/json" },
        });
        const eventsData = response.data;
        console.log("Events fetched:", eventsData);
        setEvents(eventsData);

        const currentDate = new Date();
        const futureEvents = eventsData.filter((event) => new Date(event.start_date) > currentDate);
        if (futureEvents.length > 0) {
          const nearest = futureEvents.reduce((prev, curr) =>
            new Date(prev.start_date) - currentDate < new Date(curr.start_date) - currentDate ? prev : curr
          );
          setNearestEvent(nearest);
          await checkParticipation(nearest._id, setIsParticipatingNearest);
        }

        const token = localStorage.getItem("jwt-token");
        if (!token || !isValidJwt(token)) {
          console.warn("No valid JWT token found, skipping user-specific checks.");
          setLoading(false);
          await fetchStories();
          return;
        }

        let decoded;
        try {
          decoded = jwtDecode(token);
          console.log("Decoded JWT:", { id: decoded.id, role: decoded.role, association_id: decoded.association_id });
        } catch (error) {
          console.error("Failed to decode JWT token:", error.message);
          toast.error("Invalid session. Please log in again.");
          localStorage.removeItem("jwt-token");
          setTimeout(() => navigate("/login"), 2000);
          setLoading(false);
          await fetchStories();
          return;
        }

        const participationPromises = eventsData.map((event) =>
          axios
            .get(`${BASE_URL}/events/checkParticipation/${event._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
              console.log(`Participation status for event ${event._id}:`, res.data);
              return { id: event._id, status: res.data.isParticipating };
            })
            .catch((err) => {
              console.error(`Error checking participation for event ${event._id}:`, {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
              });
              return { id: event._id, status: false };
            })
        );

        const partnerPromises = eventsData.map((event) =>
          axios
            .get(`${BASE_URL}/events/checkPartnerParticipation/${event._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
              console.log(`Partner status for event ${event._id}:`, res.data);
              return { id: event._id, status: res.data.isPartner };
            })
            .catch((err) => {
              console.error(`Error checking partner status for event ${event._id}:`, {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
              });
              return { id: event._id, status: false };
            })
        );

        const likePromises = eventsData.map((event) =>
          axios
            .get(`${BASE_URL}/events/checkLike/${event._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => ({ id: event._id, liked: res.data.liked, count: res.data.likeCount }))
            .catch((err) => {
              console.error(`Error checking like for event ${event._id}:`, err.message);
              return { id: event._id, liked: false, count: 0 };
            })
        );

        const dislikePromises = eventsData.map((event) =>
          axios
            .get(`${BASE_URL}/events/checkDislike/${event._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => ({ id: event._id, disliked: res.data.disliked, count: res.data.dislikeCount }))
            .catch((err) => {
              console.error(`Error checking dislike for event ${event._id}:`, err.message);
              return { id: event._id, disliked: false, count: 0 };
            })
        );

        const favoritePromises = eventsData.map((event) =>
          axios
            .get(`${BASE_URL}/events/checkFavorite/${event._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => ({ id: event._id, favorited: res.data.isFavorite }))
            .catch((err) => {
              console.error(`Error checking favorite for event ${event._id}:`, err.message);
              return { id: event._id, favorited: false };
            })
        );

        const [participationResults, partnerResults, likeResults, dislikeResults, favoriteResults] = await Promise.all([
          Promise.allSettled(participationPromises),
          Promise.allSettled(partnerPromises),
          Promise.allSettled(likePromises),
          Promise.allSettled(dislikePromises),
          Promise.allSettled(favoritePromises),
        ]);

        const newParticipationStatus = {};
        participationResults.forEach((result) => {
          if (result.status === "fulfilled") newParticipationStatus[result.value.id] = result.value.status;
        });
        setParticipationStatus(newParticipationStatus);

        const newPartnerStatus = {};
        partnerResults.forEach((result) => {
          if (result.status === "fulfilled") newPartnerStatus[result.value.id] = result.value.status;
        });
        setPartnerStatus(newPartnerStatus);

        const newLikes = {};
        likeResults.forEach((result) => {
          if (result.status === "fulfilled") newLikes[result.value.id] = { liked: result.value.liked, count: result.value.count };
        });
        setLikes(newLikes);

        const newDislikes = {};
        dislikeResults.forEach((result) => {
          if (result.status === "fulfilled") newDislikes[result.value.id] = { disliked: result.value.disliked, count: result.value.count };
        });
        setDislikes(newDislikes);

        const newFavorites = {};
        favoriteResults.forEach((result) => {
          if (result.status === "fulfilled") newFavorites[result.value.id] = result.value.favorited;
        });
        setFavorites(newFavorites);

        console.log("Participation status:", newParticipationStatus);
        console.log("Partner status:", newPartnerStatus);
        console.log("Likes:", newLikes);
        console.log("Dislikes:", newDislikes);
        console.log("Favorites:", newFavorites);

        if (decoded?.role === "association_member") {
          const criticalEvents = eventsData.filter((event) => event.hasPartners);
          for (const event of criticalEvents) {
            const result = partnerResults.find((r) => r.status === "fulfilled" && r.value.id === event._id);
            if (!result || !result.value.status) {
              console.log(`Retrying partner status check for event ${event._id}`);
              await checkPartnerStatus(event._id);
            }
          }
        }

        await fetchStories();
        setLoading(false);
      } catch (error) {
        console.error("Error fetching events:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        toast.error("Unable to load events");
        setLoading(false);
        await fetchStories();
      }
    };

    fetchEvents();
  }, [navigate]);

  const handleParticipationToggle = async (eventId, setStatusCallback) => {
    if (isSubmitting[eventId]) return;

    setIsSubmitting((prev) => ({ ...prev, [eventId]: true }));
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !isValidJwt(token)) {
        toast.error("Please log in to participate");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      let decoded;
      try {
        decoded = jwtDecode(token);
      } catch (error) {
        console.error("Failed to decode JWT token:", error.message);
        toast.error("Invalid session. Please log in again.");
        localStorage.removeItem("jwt-token");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      console.log("Decoded JWT:", decoded);
      const userRole = decoded.role;
      const userId = decoded.id;
      let associationId = decoded.association_id || null;

      if (userRole === "association_member" && associationId && !/^[0-9a-fA-F]{24}$/.test(associationId)) {
        console.warn("Invalid association_id in JWT:", associationId);
        toast.error("Invalid association data. Please contact support.");
        return;
      }

      const event = events.find((e) => e._id === eventId);
      if (!event) {
        toast.error("This event no longer exists");
        setEvents((prev) => prev.filter((e) => e._id !== eventId));
        return;
      }

      const isParticipating = participationStatus[eventId] || false;
      const isPartner = partnerStatus[eventId] || false;
      let url, data, toastMessage;

      if (userRole === "association_member" && event.hasPartners && !isPartner) {
        const isActuallyPartner = await checkPartnerStatus(eventId);
        if (isActuallyPartner) {
          toast.info("You are already a partner in this event");
          return;
        }
      }

      if (isPartner && userRole === "association_member") {
        url = `${BASE_URL}/events/cancelPartnerParticipation/${eventId}`;
        data = {};
        toastMessage = "You have successfully canceled your partnership!";
      } else if (isParticipating) {
        url = `${BASE_URL}/events/cancelParticipation/${eventId}`;
        data = {};
        toastMessage = "You have successfully canceled your participation!";
      } else if (userRole === "association_member") {
        if (!event.hasPartners) {
          toast.error("This event does not accept partners");
          return;
        }
        url = `${BASE_URL}/events/participateAsPartner/${eventId}`;
        data = associationId ? { association_id: associationId } : {};
        toastMessage = "You have joined as a partner!";
      } else {
        url = `${BASE_URL}/events/participate/${eventId}`;
        data = {};
        toastMessage = "You have successfully joined the event!";
      }

      console.log(`API call: ${url} with eventId: ${eventId}, data:`, data, `userId: ${userId}, associationId: ${associationId}`);
      const response = await axios.post(url, data, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const newStatus = !isParticipating && !isPartner;
      if (userRole === "association_member" && url.includes("participateAsPartner")) {
        setPartnerStatus((prev) => ({ ...prev, [eventId]: true }));
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === eventId
              ? { ...event, partners: [...(Array.isArray(event.partners) ? event.partners : []), userId] }
              : event
          )
        );
        const ticket = {
          eventTitle: event.title,
          participationType: "Partner",
          userId: userId,
          startDate: formatDate(event.start_date),
          endDate: formatDate(event.end_date),
          time: event.heure,
          location: event.event_type === "in-person" ? `${event.localisation} - ${event.lieu}` : null,
          onlineLink: event.event_type === "online" ? event.online_link : null,
        };
        const qrValue = `Ticket Details:\n🎟️ Event Ticket 🎟️\nEvent: ${ticket.eventTitle}\nType: ${ticket.participationType}\nUser ID: ${ticket.userId}\nDate: ${ticket.startDate} to ${ticket.endDate}\nTime: ${ticket.time || "N/A"}\nLocation: ${ticket.location || "N/A"}${ticket.onlineLink ? `\nOnline Link: ${ticket.onlineLink}` : ""}`;
        console.log("Partner Ticket QR Code Value:", qrValue);
        setQRCodeValue(qrValue);
        setQRCodeEventTitle(event.title);
        setIsPartnerQR(true);
        setTicketDetails(ticket);
        setShowQRCodeModal(true);
      } else if (url.includes("cancelPartnerParticipation")) {
        setPartnerStatus((prev) => ({ ...prev, [eventId]: false }));
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === eventId
              ? { ...event, partners: (Array.isArray(event.partners) ? event.partners : []).filter((id) => id !== userId) }
              : event
          )
        );
      } else if (url.includes("participate")) {
        setParticipationStatus((prev) => ({ ...prev, [eventId]: newStatus }));
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === eventId
              ? {
                  ...event,
                  participants: newStatus
                    ? [...(Array.isArray(event.participants) ? event.participants : []), userId]
                    : (Array.isArray(event.participants) ? event.participants : []).filter((id) => id !== userId),
                }
              : event
          )
        );
        const ticket = {
          eventTitle: event.title,
          participationType: "Participant",
          userId: userId,
          startDate: formatDate(event.start_date),
          endDate: formatDate(event.end_date),
          time: event.heure,
          location: event.event_type === "in-person" ? `${event.localisation} - ${event.lieu}` : null,
          onlineLink: event.event_type === "online" ? event.online_link : null,
        };
        const qrValue = `Ticket Details:\n🎟️ Event Ticket 🎟️\nEvent: ${ticket.eventTitle}\nType: ${ticket.participationType}\nUser ID: ${ticket.userId}\nDate: ${ticket.startDate} to ${ticket.endDate}\nTime: ${ticket.time || "N/A"}\nLocation: ${ticket.location || "N/A"}${ticket.onlineLink ? `\nOnline Link: ${ticket.onlineLink}` : ""}`;
        console.log("Regular Participation Ticket QR Code Value:", qrValue);
        setQRCodeValue(qrValue);
        setQRCodeEventTitle(event.title);
        setIsPartnerQR(false);
        setTicketDetails(ticket);
        setShowQRCodeModal(true);
      } else {
        setParticipationStatus((prev) => ({ ...prev, [eventId]: newStatus }));
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === eventId
              ? {
                  ...event,
                  participants: newStatus
                    ? [...(Array.isArray(event.participants) ? event.participants : []), userId]
                    : (Array.isArray(event.participants) ? event.participants : []).filter((id) => id !== userId),
                }
              : event
          )
        );
      }

      if (eventId === nearestEvent?._id) setIsParticipatingNearest(newStatus);

      setStatusCallback(newStatus);
      toast.success(response.data.message || toastMessage);

      if (url.includes("cancelPartnerParticipation") || url.includes("participateAsPartner")) {
        await checkPartnerStatus(eventId);
      } else {
        await checkParticipation(eventId, (status) => setParticipationStatus((prev) => ({ ...prev, [eventId]: status })));
      }
    } catch (error) {
      console.error("Error handling participation:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        eventId,
      });
      const errorMessage = error.response?.data?.message || "Failed to update participation";

      if (error.response?.status === 400) {
        if (errorMessage.includes("already a partner")) {
          setPartnerStatus((prev) => ({ ...prev, [eventId]: true }));
          toast.info("You are already a partner in this event");
        } else if (errorMessage.includes("already participating")) {
          setParticipationStatus((prev) => ({ ...prev, [eventId]: true }));
          toast.info("You are already participating in this event");
        } else {
          toast.error(errorMessage);
        }
      } else if (error.response?.status === 403) {
        toast.error("You are not authorized to perform this action. Please log in again.");
        localStorage.removeItem("jwt-token");
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        localStorage.removeItem("jwt-token");
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.status === 404) {
        toast.error("Event no longer exists");
        setEvents((prev) => prev.filter((e) => e._id !== eventId));
      } else if (error.response?.status === 500) {
        toast.error("Server error. Please try again later or contact support.");
        await checkPartnerStatus(eventId);
        await checkParticipation(eventId, (status) => setParticipationStatus((prev) => ({ ...prev, [eventId]: status })));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleLikeToggle = async (eventId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !isValidJwt(token)) {
        toast.error("Please log in to like an event");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const url = `${BASE_URL}/events/like/${eventId}`;
      const response = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });

      setLikes((prev) => ({
        ...prev,
        [eventId]: { liked: response.data.liked, count: response.data.likeCount },
      }));
      if (dislikes[eventId]?.disliked) {
        setDislikes((prev) => ({ ...prev, [eventId]: { disliked: false, count: prev[eventId].count - 1 } }));
      }
      toast.success(response.data.message);
    } catch (error) {
      console.error("Error liking event:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to update like");
    }
  };

  const handleDislikeToggle = async (eventId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !isValidJwt(token)) {
        toast.error("Please log in to dislike an event");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const url = `${BASE_URL}/events/dislike/${eventId}`;
      const response = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });

      setDislikes((prev) => ({
        ...prev,
        [eventId]: { disliked: response.data.disliked, count: response.data.dislikeCount },
      }));
      if (likes[eventId]?.liked) {
        setLikes((prev) => ({ ...prev, [eventId]: { liked: false, count: prev[eventId].count - 1 } }));
      }
      toast.success(response.data.message);
    } catch (error) {
      console.error("Error disliking event:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to update dislike");
    }
  };

  const handleFavoriteToggle = async (eventId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !isValidJwt(token)) {
        toast.error("Please log in to add to favorites");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const url = `${BASE_URL}/events/favorite/${eventId}`;
      const response = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });

      setFavorites((prev) => ({ ...prev, [eventId]: response.data.isFavorite }));
      toast.success(response.data.message);
    } catch (error) {
      console.error("Error adding to favorites:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to update favorites");
    }
  };

  const handleImageError = (e) => {
    e.target.src = "/assets/img/event/01.jpg";
  };

  const truncateText = (text, maxLength) => {
    if (!text) return "N/A";
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterLocationChange = (e) => {
    setFilterLocation(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterEventTypeChange = (e) => {
    setFilterEventType(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
    setCurrentPage(1);
  };

  const isEventPast = (endDate) => {
    const currentDate = new Date();
    const eventEndDate = new Date(endDate);
    return eventEndDate < currentDate;
  };

  const filteredEvents = events
    .filter((event) => {
      const title = event.title?.toLowerCase() || "";
      const term = searchTerm.toLowerCase();
      const matchesSearch = title.includes(term);
      const matchesLocation =
        filterLocation === "all" || (event.event_type === "in-person" && event.localisation === filterLocation);
      const matchesEventType = filterEventType === "all" || event.event_type === filterEventType;
      return matchesSearch && matchesLocation && matchesEventType;
    })
    .sort((a, b) => {
      if (sortOrder === "title-asc") return (a.title || "").localeCompare(b.title || "");
      if (sortOrder === "title-desc") return (b.title || "").localeCompare(a.title || "");
      if (sortOrder === "recent") return new Date(b.start_date || 0) - new Date(a.start_date || 0);
      if (sortOrder === "oldest") return new Date(a.start_date || 0) - new Date(b.start_date || 0);
      return 0;
    });

  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const backgroundImageUrl = nearestEvent?.imageUrl
    ? `url('${BASE_URL}/${nearestEvent.imageUrl.replace(/^\/+/, "")}')`
    : "url('/assets/img/coming-soon/01.jpg')";

  return (
    <>
      <div className="site-breadcrumb" style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Our Events</h2>
          <ul className="breadcrumb-menu">
            <li><Link to="/Home">Home</Link></li>
            <li className="active">Our Events</li>
          </ul>
        </div>
      </div>

      <div className="event-area py-120">
        <div className="container">
          <div className="row">
            <div className="col-lg-7 mx-auto">
              <div className="site-heading text-center wow fadeInDown" data-wow-delay=".25s">
                <span className="site-title-tagline">
                  <i className="far fa-hand-heart"></i> Upcoming Events
                </span>
                <h2 className="site-title">
                  Join our <span>events</span> to contribute
                </h2>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ textAlign: "center", marginBottom: "20px" }}>Stories</h3>
            {userId && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                <button
                  type="button"
                  onClick={() => document.getElementById("storyFileInput").click()}
                  style={{
                    backgroundColor: "#ff7f5d",
                    color: "#fff",
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background-color 0.3s ease",
                  }}
                  onMouseEnter={(e) => (e.target.style.backgroundColor = "#ff5733")}
                  onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff7f5d")}
                >
                  +
                </button>
                <input
                  id="storyFileInput"
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleImageUpload(file);
                    }
                  }}
                  style={{ display: "none" }}
                />
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "center", gap: "15px", flexWrap: "wrap" }}>
              {storyImages.length > 0 ? (
                storyImages.map((story, index) => (
                  <div
                    key={index}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "3px solid #ff7f5d",
                      cursor: "pointer",
                      transition: "transform 0.3s ease, box-shadow 0.3s ease",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                    onClick={() => {
                      setSelectedStory(story);
                      fetchReplies(story._id);
                    }}
                  >
                    <img
                      src={story.url}
                      alt={`Story ${index + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "5px",
                        width: "100%",
                        textAlign: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        color: "#fff",
                        fontSize: "12px",
                        padding: "2px",
                      }}
                    >
                      {truncateText(story.username, 10)}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "#666", fontSize: "16px" }}>No stories yet. Upload an image to add a story!</p>
              )}
            </div>
            {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
          </div>

          <div style={{ marginBottom: "30px", display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search for an event..."
              style={{
                width: "60%",
                maxWidth: "600px",
                padding: "15px 20px",
                borderRadius: "25px",
                border: "none",
                backgroundColor: "#fff",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                fontSize: "16px",
                color: "#333",
                outline: "none",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = "0 6px 20px rgba(14, 165, 230, 0.3)";
                e.target.style.width = "65%";
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.1)";
                e.target.style.width = "60%";
              }}
            />
            <select
              value={filterLocation}
              onChange={handleFilterLocationChange}
              style={{
                padding: "15px 20px",
                borderRadius: "25px",
                border: "none",
                backgroundColor: "#fff",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                fontSize: "16px",
                color: "#333",
                outline: "none",
                transition: "all 0.3s ease",
                width: "200px",
                cursor: "pointer",
              }}
            >
              <option value="all">All Locations</option>
              <option value="Ariana">Ariana</option>
              <option value="Béja">Béja</option>
            </select>
            <select
              value={filterEventType}
              onChange={handleFilterEventTypeChange}
              style={{
                padding: "15px 20px",
                borderRadius: "25px",
                border: "none",
                backgroundColor: "#fff",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                fontSize: "16px",
                color: "#333",
                outline: "none",
                transition: "all 0.3s ease",
                width: "200px",
                cursor: "pointer",
              }}
            >
              <option value="all">All Types</option>
              <option value="in-person">In-Person</option>
              <option value="online">Online</option>
            </select>
            <select
              value={sortOrder}
              onChange={handleSortChange}
              style={{
                padding: "15px 20px",
                borderRadius: "25px",
                border: "none",
                backgroundColor: "#fff",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
                fontSize: "16px",
                color: "#333",
                outline: "none",
                transition: "all 0.3s ease",
                width: "200px",
                cursor: "pointer",
              }}
            >
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <div className="row">
            {loading ? (
              <div className="col-12 text-center"><p>Loading events...</p></div>
            ) : currentEvents.length === 0 ? (
              <div className="col-12 text-center"><p>No upcoming events at the moment.</p></div>
            ) : (
              currentEvents.map((event, index) => {
                const isPast = isEventPast(event.end_date);
                return (
                  <div className="col-md-6" key={event._id}>
                    <div
                      className="event-item wow fadeInUp"
                      data-wow-delay={`.${25 + (index % 2) * 25}s`}
                      style={{
                        background: "#fff",
                        borderRadius: "15px",
                        boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
                        overflow: "hidden",
                        transition: "transform 0.3s ease, box-shadow 0.3s ease",
                        marginBottom: "30px",
                      }}
                      onMouseEnter={(e) => {
                        if (!isPast) {
                          e.currentTarget.style.transform = "translateY(-10px)";
                          e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.15)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isPast) {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.1)";
                        }
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                        <div className="event-img" style={{ position: "relative", flex: "0 0 40%" }}>
                          <Link to={`/event/${event._id}`}>
                            <img
                              src={
                                event.imageUrl
                                  ? `${BASE_URL}/${event.imageUrl.replace(/^\/+/, "")}`
                                  : `/assets/img/event/0${(index % 4) + 1}.jpg`
                              }
                              alt={event.title || "Event"}
                              onError={handleImageError}
                              style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "15px 0 0 15px" }}
                            />
                          </Link>
                          {event.event_type === "online" && (
                            <div
                              style={{
                                position: "absolute",
                                bottom: "10px",
                                left: "10px",
                                backgroundColor: "rgba(0, 123, 255, 0.9)",
                                color: "#fff",
                                padding: "5px 15px",
                                borderRadius: "20px",
                                fontSize: "14px",
                                fontWeight: "bold",
                              }}
                            >
                              Online
                            </div>
                          )}
                          {isPast && (
                            <div
                              style={{
                                position: "absolute",
                                top: "10px",
                                left: "0",
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                color: "#fff",
                                padding: "5px 20px",
                                fontSize: "14px",
                                fontWeight: "bold",
                                transform: "rotate(-45deg)",
                                transformOrigin: "0 0",
                              }}
                            >
                              Event Ended
                            </div>
                          )}
                        </div>
                        <div className="event-content" style={{ padding: "20px", flex: "1" }}>
                          <div className="event-meta">
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                              <li style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>
                                <i className="far fa-calendar-alt" style={{ color: "#ff7f5d", marginRight: "8px" }}></i>
                                {formatDate(event.start_date)} - {formatDate(event.end_date)}
                              </li>
                              {event.event_type === "in-person" ? (
                                <li style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>
                                  <i className="far fa-location-dot" style={{ color: "#ff7f5d", marginRight: "8px" }}></i>
                                  {truncateText(event.localisation, 20)} - {truncateText(event.lieu, 20)}
                                </li>
                              ) : (
                                <li style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>
                                  <i className="fas fa-link" style={{ color: "#ff7f5d", marginRight: "8px" }}></i>
                                  <a
                                    href={event.online_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "#007bff", textDecoration: "none" }}
                                  >
                                    {truncateText(event.online_link, 20)}
                                  </a>
                                </li>
                              )}
                              <li style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>
                                <i className="far fa-clock" style={{ color: "#ff7f5d", marginRight: "8px" }}></i>
                                {event.heure || "N/A"}
                              </li>
                              <li style={{ color: "#666", fontSize: "14px", marginBottom: "8px" }}>
                                <i className="fas fa-info-circle" style={{ color: "#ff7f5d", marginRight: "8px" }}></i>
                                {event.event_type === "in-person" ? "In-Person" : "Online"}
                              </li>
                            </ul>
                          </div>
                          <h4 className="event-title" style={{ margin: "10px 0", fontSize: "20px", fontWeight: "600" }}>
                          <Link
                              to={`/event/${event._id}`}
                              style={{ color: "#333", textDecoration: "none", transition: "color 0.3s ease" }}
                              onMouseEnter={(e) => (e.target.style.color = "#ff7f5d")}
                              onMouseLeave={(e) => (e.target.style.color = "#333")}
                            >
                              {truncateText(event.title, 25)}
                            </Link>
                          </h4>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                            <Link
                              to={`/event/${event._id}`}
                              className="theme-btn"
                              style={{
                                backgroundColor: "#ff7f5d",
                                color: "#fff",
                                padding: "10px 20px",
                                borderRadius: "25px",
                                textDecoration: "none",
                                fontWeight: "500",
                                transition: "background-color 0.3s ease, transform 0.3s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = "#ff5733";
                                e.target.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = "#ff7f5d";
                                e.target.style.transform = "scale(1)";
                              }}
                            >
                              Details <i className="fas fa-circle-arrow-right" style={{ marginLeft: "8px" }}></i>
                            </Link>
                            <button
                              title={
                                userRole === "association_member" && event.hasPartners
                                  ? "Join this event as an association partner"
                                  : "Participate in this event"
                              }
                              onClick={() =>
                                handleParticipationToggle(event._id, (status) =>
                                  setParticipationStatus((prev) => ({ ...prev, [event._id]: status }))
                                )
                              }
                              disabled={isSubmitting[event._id] || isPast}
                              className="theme-btn"
                              style={{
                                backgroundColor: isPast
                                  ? "#ccc"
                                  : participationStatus[event._id] || partnerStatus[event._id]
                                  ? "#dc3545"
                                  : "#28a745",
                                color: "#fff",
                                padding: "10px 20px",
                                borderRadius: "25px",
                                border: "none",
                                fontWeight: "500",
                                transition: "background-color 0.3s ease, transform 0.3s ease",
                                cursor: isSubmitting[event._id] || isPast ? "not-allowed" : "pointer",
                                opacity: isPast ? 0.7 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubmitting[event._id] && !isPast) {
                                  e.target.style.backgroundColor =
                                    participationStatus[event._id] || partnerStatus[event._id] ? "#c82333" : "#218838";
                                  e.target.style.transform = "scale(1.05)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSubmitting[event._id] && !isPast) {
                                  e.target.style.backgroundColor = isPast
                                    ? "#ccc"
                                    : participationStatus[event._id] || partnerStatus[event._id]
                                    ? "#dc3545"
                                    : "#28a745";
                                  e.target.style.transform = "scale(1)";
                                }
                              }}
                            >
                              {isSubmitting[event._id]
                                ? "Processing..."
                                : isPast
                                ? "Event Ended"
                                : partnerStatus[event._id]
                                ? "Cancel Partnership"
                                : participationStatus[event._id]
                                ? "Cancel Participation"
                                : userRole === "association_member" && event.hasPartners
                                ? "Join as Partner"
                                : "Join Now"}
                              <i className="fas fa-circle-arrow-right" style={{ marginLeft: "8px" }}></i>
                            </button>
                            <button
                              onClick={() => handleLikeToggle(event._id)}
                              disabled={isPast}
                              style={{
                                backgroundColor: likes[event._id]?.liked ? "#007bff" : "#e9ecef",
                                color: likes[event._id]?.liked ? "#fff" : "#333",
                                padding: "8px 15px",
                                borderRadius: "20px",
                                border: "none",
                                transition: "background-color 0.3s ease",
                                cursor: isPast ? "not-allowed" : "pointer",
                                opacity: isPast ? 0.7 : 1,
                              }}
                            >
                              <i className="fas fa-thumbs-up"></i> {likes[event._id]?.count || 0}
                            </button>
                            <button
                              onClick={() => handleDislikeToggle(event._id)}
                              disabled={isPast}
                              style={{
                                backgroundColor: dislikes[event._id]?.disliked ? "#dc3545" : "#e9ecef",
                                color: dislikes[event._id]?.disliked ? "#fff" : "#333",
                                padding: "8px 15px",
                                borderRadius: "20px",
                                border: "none",
                                transition: "background-color 0.3s ease",
                                cursor: isPast ? "not-allowed" : "pointer",
                                opacity: isPast ? 0.7 : 1,
                              }}
                            >
                              <i className="fas fa-thumbs-down"></i> {dislikes[event._id]?.count || 0}
                            </button>
                            <button
                              onClick={() => handleFavoriteToggle(event._id)}
                              disabled={isPast}
                              style={{
                                backgroundColor: favorites[event._id] ? "#ffc107" : "#e9ecef",
                                color: favorites[event._id] ? "#fff" : "#333",
                                padding: "8px 15px",
                                borderRadius: "20px",
                                border: "none",
                                transition: "background-color 0.3s ease",
                                cursor: isPast ? "not-allowed" : "pointer",
                                opacity: isPast ? 0.7 : 1,
                              }}
                            >
                              <i className="fas fa-star"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ textAlign: "center", marginTop: "20px" }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  style={{
                    margin: "0 5px",
                    padding: "5px 10px",
                    backgroundColor: currentPage === i + 1 ? "#ff5733" : "#ccc",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showComingSoon && nearestEvent && (
        <div
          className="coming-soon py-90"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: backgroundImageUrl,
            zIndex: 9999,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="container" style={{ position: "relative" }}>
            <button
              onClick={() => setShowComingSoon(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                width: "40px",
                height: "40px",
                backgroundColor: "#ff7f5d",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 0.3s ease",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#ff5733")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff7f5d")}
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="row">
              <div className="col-lg-8 col-xl-6 mx-auto">
                <div className="coming-wrap">
                  <div className="coming-content">
                    <div className="coming-info">
                      <h1>Next Event</h1>
                      <p>
                        Our next event "<strong>{nearestEvent.title}</strong>" is in preparation. Join us soon for this
                        amazing event, subscribe to be notified.
                      </p>
                      <div className="coming-countdown-wrap">
                        <Countdown targetDate={nearestEvent.start_date} />
                      </div>
                      <button
                        title={
                          userRole === "association_member" && nearestEvent.hasPartners
                            ? "Join this event as an association partner"
                            : "Participate in this event"
                        }
                        onClick={() => handleParticipationToggle(nearestEvent._id, setIsParticipatingNearest)}
                        disabled={isSubmitting[nearestEvent._id] || isEventPast(nearestEvent.end_date)}
                        className="theme-btn"
                        style={{
                          backgroundColor: isEventPast(nearestEvent.end_date)
                            ? "#ccc"
                            : isParticipatingNearest || partnerStatus[nearestEvent._id]
                            ? "#dc3545"
                            : "#28a745",
                          color: "#fff",
                          padding: "12px 25px",
                          borderRadius: "25px",
                          border: "none",
                          fontWeight: "500",
                          transition: "background-color 0.3s ease, transform 0.3s ease",
                          cursor: isSubmitting[nearestEvent._id] || isEventPast(nearestEvent.end_date) ? "not-allowed" : "pointer",
                          marginTop: "20px",
                          opacity: isEventPast(nearestEvent.end_date) ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSubmitting[nearestEvent._id] && !isEventPast(nearestEvent.end_date)) {
                            e.target.style.backgroundColor =
                              isParticipatingNearest || partnerStatus[nearestEvent._id] ? "#c82333" : "#218838";
                            e.target.style.transform = "scale(1.05)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSubmitting[nearestEvent._id] && !isEventPast(nearestEvent.end_date)) {
                            e.target.style.backgroundColor = isEventPast(nearestEvent.end_date)
                              ? "#ccc"
                              : isParticipatingNearest || partnerStatus[nearestEvent._id]
                              ? "#dc3545"
                              : "#28a745";
                            e.target.style.transform = "scale(1)";
                          }
                        }}
                      >
                        {isSubmitting[nearestEvent._id]
                          ? "Processing..."
                          : isEventPast(nearestEvent.end_date)
                          ? "Event Ended"
                          : partnerStatus[nearestEvent._id]
                          ? "Cancel Partnership"
                          : isParticipatingNearest
                          ? "Cancel Participation"
                          : userRole === "association_member" && nearestEvent.hasPartners
                          ? "Join as Partner"
                          : "Join Now"}
                        <i className="fas fa-circle-arrow-right" style={{ marginLeft: "8px" }}></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <StoryModal
        isOpen={!!selectedStory}
        onClose={() => {
          setSelectedStory(null);
          setReplyText("");
          setShowEmojiPicker(false);
        }}
        story={selectedStory}
        userId={userId}
        onLike={handleLikeStory}
        onReply={handleReplyStory}
        onEmojiSelect={handleEmojiSelect}
        replies={storyReplies[selectedStory?._id] || []}
        replyText={replyText}
        setReplyText={setReplyText}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
      />

      <QRCodeModal
        isOpen={showQRCodeModal}
        onClose={() => setShowQRCodeModal(false)}
        qrCodeValue={qrCodeValue}
        eventTitle={qrCodeEventTitle}
        isPartner={isPartnerQR}
        ticketDetails={ticketDetails}
      />

      <ToastContainer />
    </>
  );
};

export default Events;