import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css"; // Assurez-vous que ce fichier contient les styles personnalisés du thème

const BASE_URL = "http://localhost:5000";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        console.log("Récupération des événements depuis:", `${BASE_URL}/events/getEvents`);
        const response = await axios.get(`${BASE_URL}/events/getEvents`, {
          headers: { "Content-Type": "application/json" },
        });
        console.log("Événements reçus:", response.data);
        setEvents(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération des événements:", error.response?.data || error.message);
        toast.error("Impossible de charger les événements");
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }); // Ex: "20 Mar 2025"
  };

  const handleImageError = (e) => {
    // Si l'image ne charge pas, utiliser une image par défaut
    e.target.src = `/assets/img/event/01.jpg`;
  };

  return (
    <>
      {/* Breadcrumb */}
      <div
        className="site-breadcrumb"
        style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}
      >
        <div className="container">
          <h2 className="breadcrumb-title">Our Events</h2>
          <ul className="breadcrumb-menu">
            <li>
              <Link to="/Home">Home</Link>
            </li>
            <li className="active">Our Events</li>
          </ul>
        </div>
      </div>

      {/* Event Area */}
      <div className="event-area py-120">
        <div className="container">
          <div className="row">
            <div className="col-lg-7 mx-auto">
              <div
                className="site-heading text-center wow fadeInDown"
                data-wow-delay=".25s"
              >
                <span className="site-title-tagline">
                  <i className="far fa-hand-heart"></i> Upcoming Events
                </span>
                <h2 className="site-title">
                  Join Our Upcoming <span>Events For Your</span> Contribution
                </h2>
              </div>
            </div>
          </div>

          <div className="row">
            {loading ? (
              <div className="col-12 text-center">
                <p>Chargement des événements...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="col-12 text-center">
                <p>Aucun événement à venir pour le moment.</p>
              </div>
            ) : (
              events.map((event, index) => (
                <div className="col-md-6" key={event._id}>
                  <div
                    className="event-item wow fadeInUp"
                    data-wow-delay={`.${25 + (index % 2) * 25}s`}
                  >
                    <div className="event-img">
                      <Link to={`/event/${event._id}`}>
                        <img
                          src={
                            event.imageUrl
                              ? `${BASE_URL}${event.imageUrl}`
                              : `/assets/img/event/0${(index % 4) + 1}.jpg`
                          }
                          alt={event.title}
                          onError={handleImageError}
                        />
                      </Link>
                    </div>
                    <div className="event-content">
                      <div className="event-meta">
                        <ul>
                          <li>
                            <i className="far fa-calendar-alt"></i>
                            {formatDate(event.date)}
                          </li>
                          <li>
                            <i className="far fa-location-dot"></i>
                            {event.localisation}
                          </li>
                        </ul>
                      </div>
                      <h4 className="event-title">
                        <Link to={`/event/${event._id}`}>{event.title}</Link>
                      </h4>
                      <p>{event.description.substring(0, 100)}...</p>
                      <Link to={`/event/${event._id}`} className="theme-btn">
                        Join Now <i className="fas fa-circle-arrow-right"></i>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
};

export default Events;