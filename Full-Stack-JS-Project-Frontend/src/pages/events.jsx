import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

const BASE_URL = "http://localhost:5000";

// Composant Countdown (inchangé)
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
  const [likes, setLikes] = useState({}); // État pour les likes
  const [dislikes, setDislikes] = useState({}); // État pour les dislikes
  const [favorites, setFavorites] = useState({}); // État pour les favoris
  const eventsPerPage = 6;

  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
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
        if (token) {
          const participationPromises = eventsData.map((event) =>
            axios.get(`${BASE_URL}/events/checkParticipation/${event._id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => ({ id: event._id, status: res.data.isParticipating }))
              .catch(() => ({ id: event._id, status: false }))
          );

          const partnerPromises = eventsData.map((event) =>
            axios.get(`${BASE_URL}/events/checkPartnerParticipation/${event._id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => ({ id: event._id, status: res.data.isPartner }))
              .catch(() => ({ id: event._id, status: false }))
          );

          const likePromises = eventsData.map((event) =>
            axios.get(`${BASE_URL}/events/checkLike/${event._id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => ({ id: event._id, liked: res.data.liked, count: res.data.likeCount }))
              .catch(() => ({ id: event._id, liked: false, count: 0 }))
          );

          const dislikePromises = eventsData.map((event) =>
            axios.get(`${BASE_URL}/events/checkDislike/${event._id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => ({ id: event._id, disliked: res.data.disliked, count: res.data.dislikeCount }))
              .catch(() => ({ id: event._id, disliked: false, count: 0 }))
          );

          const favoritePromises = eventsData.map((event) =>
            axios.get(`${BASE_URL}/events/checkFavorite/${event._id}`, { headers: { Authorization: `Bearer ${token}` } })
              .then((res) => ({ id: event._id, favorited: res.data.isFavorite }))
              .catch(() => ({ id: event._id, favorited: false }))
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

          console.log("Likes:", newLikes);
          console.log("Dislikes:", newDislikes);
          console.log("Favorites:", newFavorites);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching events:", error.response?.data || error.message);
        toast.error("Unable to load events");
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const checkParticipation = async (eventId, setStatusCallback) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) return;

      const response = await axios.get(`${BASE_URL}/events/checkParticipation/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatusCallback(response.data.isParticipating);
    } catch (error) {
      console.error("Error checking participation:", error.response?.data || error.message);
    }
  };

  const handleParticipationToggle = async (eventId, setStatusCallback) => {
    if (isSubmitting[eventId]) return;

    setIsSubmitting((prev) => ({ ...prev, [eventId]: true }));
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        toast.error("Please log in to participate");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const decoded = jwtDecode(token);
      const userRole = decoded.role;
      const userId = decoded.id;
      const associationId = decoded.association_id || null;

      const eventExists = events.find((e) => e._id === eventId);
      if (!eventExists) {
        toast.error("This event no longer exists");
        setEvents((prev) => prev.filter((e) => e._id !== eventId));
        return;
      }

      const isParticipating = participationStatus[eventId];
      let url, data, newStatus, toastMessage;

      if (isParticipating) {
        url = `${BASE_URL}/events/cancelParticipation/${eventId}`;
        data = {};
        newStatus = false;
        toastMessage = "You have successfully canceled your participation!";
      } else if (userRole === "association_member") {
        url = `${BASE_URL}/events/participateAsPartner/${eventId}`;
        data = associationId ? { association_id: associationId } : {};
        newStatus = true;
        toastMessage = "You have joined as a partner!";
      } else {
        url = `${BASE_URL}/events/participate/${eventId}`;
        data = {};
        newStatus = true;
        toastMessage = "You have successfully joined the event!";
      }

      console.log(`Calling API: ${url} with eventId: ${eventId}`);
      const response = await axios.post(url, data, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      setStatusCallback(newStatus);
      if (userRole === "association_member" && !isParticipating) {
        setPartnerStatus((prev) => ({ ...prev, [eventId]: true }));
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === eventId ? { ...event, partners: [...(event.partners || []), userId] } : event
          )
        );
      } else {
        setParticipationStatus((prev) => ({ ...prev, [eventId]: newStatus }));
        setEvents((prevEvents) =>
          prevEvents.map((event) =>
            event._id === eventId
              ? {
                  ...event,
                  participants: newStatus
                    ? [...(event.participants || []), userId]
                    : (event.participants || []).filter((id) => id !== userId),
                }
              : event
          )
        );
      }

      if (eventId === nearestEvent?._id) setIsParticipatingNearest(newStatus);

      toast.success(response.data.message || toastMessage);
    } catch (error) {
      console.error("Erreur lors de la gestion de la participation:", error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || "Failed to update participation";
      toast.error(errorMessage);
      if (error.response?.status === 403 || error.response?.status === 401) {
        setTimeout(() => {
          localStorage.removeItem("jwt-token");
          navigate("/login");
        }, 2000);
      } else if (error.response?.status === 404) {
        setEvents((prev) => prev.filter((e) => e._id !== eventId));
      }
    } finally {
      setIsSubmitting((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleLikeToggle = async (eventId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
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
      console.error("Error toggling like:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to update like");
    }
  };

  const handleDislikeToggle = async (eventId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
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
      console.error("Error toggling dislike:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to update dislike");
    }
  };

  const handleFavoriteToggle = async (eventId) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        toast.error("Please log in to add to favorites");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const url = `${BASE_URL}/events/favorite/${eventId}`;
      const response = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });

      setFavorites((prev) => ({ ...prev, [eventId]: response.data.isFavorite }));
      toast.success(response.data.message);
    } catch (error) {
      console.error("Error toggling favorite:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Failed to update favorite");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Invalid Date"
      : date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
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
                  Join Our Upcoming <span>Events For Your</span> Contribution
                </h2>
              </div>
            </div>
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
            <select value={filterLocation} onChange={handleFilterLocationChange} style={{ padding: "15px 20px", borderRadius: "25px", border: "none", backgroundColor: "#fff", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)", fontSize: "16px", color: "#333", outline: "none", transition: "all 0.3s ease", width: "200px", cursor: "pointer" }}>
              <option value="all">All Locations</option>
              <option value="Ariana">Ariana</option>
              <option value="Béja">Béja</option>
              {/* Autres options */}
            </select>
            <select value={filterEventType} onChange={handleFilterEventTypeChange} style={{ padding: "15px 20px", borderRadius: "25px", border: "none", backgroundColor: "#fff", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)", fontSize: "16px", color: "#333", outline: "none", transition: "all 0.3s ease", width: "200px", cursor: "pointer" }}>
              <option value="all">All Types</option>
              <option value="in-person">In-Person</option>
              <option value="online">Online</option>
            </select>
            <select value={sortOrder} onChange={handleSortChange} style={{ padding: "15px 20px", borderRadius: "25px", border: "none", backgroundColor: "#fff", boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)", fontSize: "16px", color: "#333", outline: "none", transition: "all 0.3s ease", width: "200px", cursor: "pointer" }}>
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
              currentEvents.map((event, index) => (
                <div className="col-md-6" key={event._id}>
                  <div className="event-item wow fadeInUp" data-wow-delay={`.${25 + (index % 2) * 25}s`} style={{ background: "#fff", borderRadius: "15px", boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)", overflow: "hidden", transition: "transform 0.3s ease, box-shadow 0.3s ease", marginBottom: "30px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-10px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.15)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.1)"; }}>
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      <div className="event-img" style={{ position: "relative", flex: "0 0 40%" }}>
                        <Link to={`/event/${event._id}`}>
                          <img
                            src={event.imageUrl ? `${BASE_URL}/${event.imageUrl.replace(/^\/+/, "")}` : `/assets/img/event/0${(index % 4) + 1}.jpg`}
                            alt={event.title || "Event"}
                            onError={handleImageError}
                            style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "15px 0 0 15px" }}
                          />
                        </Link>
                        {event.event_type === "online" && (
                          <div style={{ position: "absolute", bottom: "10px", left: "10px", backgroundColor: "rgba(0, 123, 255, 0.9)", color: "#fff", padding: "5px 15px", borderRadius: "20px", fontSize: "14px", fontWeight: "bold" }}>
                            Online
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
                                <a href={event.online_link} target="_blank" rel="noopener noreferrer" style={{ color: "#007bff", textDecoration: "none" }}>
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
                          <Link to={`/event/${event._id}`} style={{ color: "#333", textDecoration: "none", transition: "color 0.3s ease" }}
                            onMouseEnter={(e) => (e.target.style.color = "#ff7f5d")}
                            onMouseLeave={(e) => (e.target.style.color = "#333")}>
                            {truncateText(event.title, 25)}
                          </Link>
                        </h4>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <Link to={`/event/${event._id}`} className="theme-btn" style={{ backgroundColor: "#ff7f5d", color: "#fff", padding: "10px 20px", borderRadius: "25px", textDecoration: "none", fontWeight: "500", transition: "background-color 0.3s ease, transform 0.3s ease" }}
                            onMouseEnter={(e) => { e.target.style.backgroundColor = "#ff5733"; e.target.style.transform = "scale(1.05)"; }}
                            onMouseLeave={(e) => { e.target.style.backgroundColor = "#ff7f5d"; e.target.style.transform = "scale(1)"; }}>
                            Details <i className="fas fa-circle-arrow-right" style={{ marginLeft: "8px" }}></i>
                          </Link>
                          <button
                            onClick={() => handleParticipationToggle(event._id, (status) => setParticipationStatus((prev) => ({ ...prev, [event._id]: status })))}
                            disabled={isSubmitting[event._id]}
                            className="theme-btn"
                            style={{
                              backgroundColor: participationStatus[event._id] ? "#dc3545" : "#28a745",
                              color: "#fff",
                              padding: "10px 20px",
                              borderRadius: "25px",
                              border: "none",
                              fontWeight: "500",
                              transition: "background-color 0.3s ease, transform 0.3s ease",
                              cursor: isSubmitting[event._id] ? "not-allowed" : "pointer",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSubmitting[event._id]) {
                                e.target.style.backgroundColor = participationStatus[event._id] ? "#c82333" : "#218838";
                                e.target.style.transform = "scale(1.05)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSubmitting[event._id]) {
                                e.target.style.backgroundColor = participationStatus[event._id] ? "#dc3545" : "#28a745";
                                e.target.style.transform = "scale(1)";
                              }
                            }}
                          >
                            {isSubmitting[event._id] ? "Processing..." : participationStatus[event._id] ? "Leave Now" : "Join Now"}
                            <i className="fas fa-circle-arrow-right" style={{ marginLeft: "8px" }}></i>
                          </button>
                          {/* Boutons Like, Dislike, Favoris */}
                          <button
                            onClick={() => handleLikeToggle(event._id)}
                            style={{
                              backgroundColor: likes[event._id]?.liked ? "#007bff" : "#e9ecef",
                              color: likes[event._id]?.liked ? "#fff" : "#333",
                              padding: "8px 15px",
                              borderRadius: "20px",
                              border: "none",
                              transition: "background-color 0.3s ease",
                            }}
                          >
                            <i className="fas fa-thumbs-up"></i> {likes[event._id]?.count || 0}
                          </button>
                          <button
                            onClick={() => handleDislikeToggle(event._id)}
                            style={{
                              backgroundColor: dislikes[event._id]?.disliked ? "#dc3545" : "#e9ecef",
                              color: dislikes[event._id]?.disliked ? "#fff" : "#333",
                              padding: "8px 15px",
                              borderRadius: "20px",
                              border: "none",
                              transition: "background-color 0.3s ease",
                            }}
                          >
                            <i className="fas fa-thumbs-down"></i> {dislikes[event._id]?.count || 0}
                          </button>
                          <button
                            onClick={() => handleFavoriteToggle(event._id)}
                            style={{
                              backgroundColor: favorites[event._id] ? "#ffc107" : "#e9ecef",
                              color: favorites[event._id] ? "#fff" : "#333",
                              padding: "8px 15px",
                              borderRadius: "20px",
                              border: "none",
                              transition: "background-color 0.3s ease",
                            }}
                          >
                            <i className="fas fa-star"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
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
        <div className="coming-soon py-90" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: backgroundImageUrl, zIndex: 9999, backgroundSize: "cover", backgroundPosition: "center" }}>
          <div className="container" style={{ position: "relative" }}>
            <button
              onClick={() => setShowComingSoon(false)}
              style={{ position: "absolute", top: "10px", right: "10px", width: "40px", height: "40px", backgroundColor: "#ff7f5d", color: "#fff", border: "none", borderRadius: "50%", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.3s ease" }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "#ff5733")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "#ff7f5d")}>
              <i className="fas fa-times"></i>
            </button>
            <div className="row">
              <div className="col-lg-8 col-xl-6 mx-auto">
                <div className="coming-wrap">
                  <div className="coming-content">
                    <div className="coming-info">
                      <h1>We're Coming Soon</h1>
                      <p>
                        Our next event "<strong>{nearestEvent.title}</strong>" is under preparation. We'll be here soon with this awesome event, subscribe to be notified.
                      </p>
                      <div className="coming-countdown-wrap">
                        <Countdown targetDate={nearestEvent.start_date} />
                      </div>
                      <button
                        onClick={() => handleParticipationToggle(nearestEvent._id, setIsParticipatingNearest)}
                        disabled={isSubmitting[nearestEvent._id]}
                        className="theme-btn"
                        style={{
                          backgroundColor: isParticipatingNearest ? "#dc3545" : "#28a745",
                          color: "#fff",
                          padding: "12px 25px",
                          borderRadius: "25px",
                          border: "none",
                          fontWeight: "500",
                          transition: "background-color 0.3s ease, transform 0.3s ease",
                          cursor: isSubmitting[nearestEvent._id] ? "not-allowed" : "pointer",
                          marginTop: "20px",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSubmitting[nearestEvent._id]) {
                            e.target.style.backgroundColor = isParticipatingNearest ? "#c82333" : "#218838";
                            e.target.style.transform = "scale(1.05)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSubmitting[nearestEvent._id]) {
                            e.target.style.backgroundColor = isParticipatingNearest ? "#dc3545" : "#28a745";
                            e.target.style.transform = "scale(1)";
                          }
                        }}
                      >
                        {isSubmitting[nearestEvent._id] ? "Processing..." : isParticipatingNearest ? "Cancel Participation" : "Join Now"}
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

      <ToastContainer />
    </>
  );
};

export default Events;