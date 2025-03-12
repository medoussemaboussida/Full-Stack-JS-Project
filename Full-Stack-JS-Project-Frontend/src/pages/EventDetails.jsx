import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import { jwtDecode } from 'jwt-decode';
import html2pdf from 'html2pdf.js';

const BASE_URL = "http://localhost:5000";

const EventDetails = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();
  const pdfRef = useRef(); // Initialisation de pdfRef

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.id);
      } catch (error) {
        console.error("Erreur décodage token:", error);
        toast.error("Session invalide, veuillez vous reconnecter");
      }
    }

    const fetchEvent = async () => {
      try {
        console.log(`Récupération de l'événement avec ID: ${id}`);
        const response = await axios.get(`${BASE_URL}/events/getEvent/${id}`, {
          headers: { "Content-Type": "application/json" },
        });
        setEvent(response.data);
        setFormData({
          ...response.data,
          date: new Date(response.data.date).toISOString().split("T")[0],
        });
        // Vérifier l'URL de l'image
        const imageUrl = response.data.imageUrl
          ? response.data.imageUrl.startsWith("http")
            ? response.data.imageUrl
            : `${BASE_URL}${response.data.imageUrl}`
          : "/assets/img/event/single.jpg";
        console.log("URL de l'image:", imageUrl);
        // Tester si l'image est accessible
        const img = new Image();
        img.src = imageUrl;
        img.onload = () => console.log("Image chargée avec succès:", imageUrl);
        img.onerror = () => console.error("Erreur de chargement de l'image:", imageUrl);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'événement:", error.response?.data || error.message);
        toast.error(`Erreur chargement: ${error.message}`);
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    const [hours, minutes] = timeString.split(":");
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${period}`;
  };

  const handleImageError = (e) => {
    e.target.src = "/assets/img/event/single.jpg";
  };

  const handleOrganizerImageError = (e) => {
    e.target.src = "/assets/img/event/author.jpg";
  };

  const handleUpdate = () => setIsEditing(true);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) throw new Error("Aucun token trouvé");
      const updatedData = { ...formData };
      const response = await axios.put(`${BASE_URL}/events/${id}`, updatedData, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      setEvent(response.data.data);
      setFormData({
        ...response.data.data,
        date: new Date(response.data.data.date).toISOString().split("T")[0],
      });
      setIsEditing(false);
      toast.success("Mise à jour réussie !");
    } catch (error) {
      toast.error(error.response?.data?.message || "Erreur mise à jour");
    }
  };

  const handleCancel = () => {
    setFormData({
      ...event,
      date: new Date(event.date).toISOString().split("T")[0],
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer ?")) return;
    try {
      const token = localStorage.getItem("jwt-token");
      await axios.delete(`${BASE_URL}/events/${id}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      toast.success("Suppression réussie !");
      setTimeout(() => navigate("/events"), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Erreur suppression");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const element = pdfRef.current;
      if (!element) {
        throw new Error("Élément PDF introuvable. Assurez-vous que pdfRef est correctement défini.");
      }

      // Pré-charger toutes les images et les convertir en base64 pour contourner les problèmes CORS
      const images = element.getElementsByTagName("img");
      await Promise.all(
        Array.from(images).map(async (img) => {
          const imgUrl = img.src;
          if (imgUrl.includes("http")) {
            try {
              // Charger l'image en base64
              const response = await fetch(imgUrl, { mode: "cors" });
              const blob = await response.blob();
              const reader = new FileReader();
              await new Promise((resolve) => {
                reader.onload = () => {
                  img.src = reader.result; // Remplacer l'URL par la version base64
                  resolve();
                };
                reader.onerror = () => {
                  console.warn(`Erreur de conversion en base64 pour l'image: ${imgUrl}`);
                  resolve();
                };
                reader.readAsDataURL(blob);
              });
            } catch (error) {
              console.error(`Erreur lors du chargement de l'image ${imgUrl}:`, error);
              img.src = "/assets/img/event/single.jpg"; // Image par défaut en cas d'échec
            }
          }
        })
      );

      // Attendre que les images soient complètement chargées
      await new Promise((resolve) => {
        const images = element.getElementsByTagName("img");
        let loaded = 0;
        if (images.length === 0) {
          resolve();
          return;
        }
        Array.from(images).forEach((img) => {
          if (img.complete && img.naturalHeight > 0) {
            loaded++;
          } else {
            img.onload = () => {
              loaded++;
              if (loaded === images.length) resolve();
            };
            img.onerror = () => {
              console.warn(`Erreur de chargement de l'image: ${img.src}`);
              loaded++;
              if (loaded === images.length) resolve();
            };
          }
        });
        if (loaded === images.length) resolve();
      });

      const opt = {
        margin: 0.5,
        filename: `${event.title}_Details.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true, // Activer CORS pour les images externes
          logging: true, // Activer les logs pour déboguer
        },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      };

      // Générer et télécharger le PDF
      await html2pdf().from(element).set(opt).save();
      console.log("PDF généré avec succès côté client");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF côté client:", error);
      toast.error(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  };

  if (loading) return <div className="text-center py-5">Chargement...</div>;
  if (!event) return <div className="text-center py-5">Événement non trouvé</div>;

  const isCreator = userId && event.created_by?._id === userId;

  return (
    <>
      <div className="site-breadcrumb" style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Event Single</h2>
          <ul className="breadcrumb-menu">
            <li><Link to="/Home">Home</Link></li>
            <li className="active">Event Single</li>
          </ul>
        </div>
      </div>

      <div className="event-single py-120" ref={pdfRef}>
        <div className="container">
          <div className="event-single-wrap">
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="event-details">
                  <img
                    src={event.imageUrl ? (event.imageUrl.startsWith("http") ? event.imageUrl : `${BASE_URL}${event.imageUrl}`) : "/assets/img/event/single.jpg"}
                    alt={event.title}
                    onError={handleImageError}
                  />
                  {isEditing ? (
                    <form onSubmit={handleFormSubmit} className="mt-4">
                      <div className="my-4">
                        <h3 className="mb-2">About The Event</h3>
                        <textarea
                          name="description"
                          value={formData.description || ""}
                          onChange={handleFormChange}
                          className="form-control"
                          rows="4"
                        />
                      </div>
                      <div className="mb-4">
                        <h3 className="mb-2">Where The Event?</h3>
                        <input
                          type="text"
                          name="lieu"
                          value={formData.lieu || ""}
                          onChange={handleFormChange}
                          className="form-control"
                        />
                      </div>
                      <div className="mb-4">
                        <h3 className="mb-2">Who This Event Is For?</h3>
                        <p>
                          This event is open to all individuals and organizations interested in contributing to{" "}
                          <input
                            type="text"
                            name="title"
                            value={formData.title || ""}
                            onChange={handleFormChange}
                            className="form-control d-inline-block w-auto"
                          />{" "}
                          . Contact {event.created_by?.email || event.contact_email} for more details.
                        </p>
                      </div>
                      <button type="submit" className="theme-btn me-2">
                        Save <i className="fas fa-save"></i>
                      </button>
                      <button type="button" onClick={handleCancel} className="theme-btn btn-danger">
                        Cancel <i className="fas fa-times"></i>
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="my-4">
                        <h3 className="mb-2">About The Event</h3>
                        <p>{event.description || "Aucune description"}</p>
                      </div>
                      <div className="mb-4">
                        <h3 className="mb-2">Where The Event?</h3>
                        <p>{event.lieu || "Aucun lieu"}</p>
                      </div>
                      <div className="mb-4">
                        <h3 className="mb-2">Who This Event Is For?</h3>
                        <p>
                          This event is open to all individuals and organizations interested in contributing to{" "}
                          {event.title || "Aucun titre"}. Contact {event.created_by?.email || event.contact_email || "Aucun contact"} for more details.
                        </p>
                      </div>
                    </>
                  )}
                  <div className="event-map mt-5" style={{ display: "none" }}>
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d96708.34194156103!2d-74.03927096447748!3d40.759040329405195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x4a01c8df6fb3cb8!2sSolomon%20R.%20Guggenheim%20Museum!5e0!3m2!1sen!2sbd!4v1619410634508!5m2!1sen!2sbd"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                      title="Event Location"
                    />
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="event-sidebar">
                  <div className="widget">
                    <div className="header">
                      <h4 className="title">Event Information</h4>
                      <p>It is a long established fact that a reader will be distracted by the readable content.</p>
                    </div>
                    <div className="event-single-info">
                      <div className="event-single-item">
                        <h5>Event Date</h5>
                        {isEditing ? (
                          <input
                            type="date"
                            name="date"
                            value={formData.date || ""}
                            onChange={handleFormChange}
                            className="form-control"
                          />
                        ) : (
                          <p>
                            <i className="far fa-calendar-alt"></i>
                            {event.date ? formatDate(event.date) : "Date non définie"}
                          </p>
                        )}
                      </div>
                      <div className="event-single-item">
                        <h5>Event Time</h5>
                        {isEditing ? (
                          <input
                            type="time"
                            name="heure"
                            value={formData.heure || ""}
                            onChange={handleFormChange}
                            className="form-control"
                          />
                        ) : (
                          <p>
                            <i className="far fa-clock"></i>
                            {event.heure ? formatTime(event.heure) : "Heure non définie"} - 04:00 PM
                          </p>
                        )}
                      </div>
                      <div className="event-single-item">
                        <h5>Event Location</h5>
                        {isEditing ? (
                          <input
                            type="text"
                            name="localisation"
                            value={formData.localisation || ""}
                            onChange={handleFormChange}
                            className="form-control"
                          />
                        ) : (
                          <p>
                            <i className="far fa-map-marker-alt"></i>
                            {event.localisation || "Localisation non définie"}
                          </p>
                        )}
                      </div>
                      <div className="event-single-item">
                        <h5>Event Cost</h5>
                        <p>
                          <i className="far fa-usd-circle"></i>
                          150
                        </p>
                      </div>
                      <Link to="#" className="theme-btn">
                        Book Now <i className="fas fa-arrow-right"></i>
                      </Link>
                    </div>
                  </div>
                  <div className="widget">
                    <h4 className="title">Event Organizer</h4>
                    <div className="event-single-author">
                      <div className="author-info">
                        <img
                          src={
                            event.created_by?.imageUrl
                              ? (event.created_by.imageUrl.startsWith("http") ? event.created_by.imageUrl : `${BASE_URL}${event.created_by.imageUrl}`)
                              : "/assets/img/event/author.jpg"
                          }
                          alt={event.created_by?.username || "Organizer"}
                          onError={handleOrganizerImageError}
                          style={{ width: "200px", height: "200px", objectFit: "cover" }}
                        />
                        <h5>{event.created_by?.username || "Organisateur inconnu"}</h5>
                        <p>
                          Contact {event.created_by?.email || event.contact_email || "Aucun contact"} for inquiries about this event.
                        </p>
                        <div className="mt-3">
                          <button onClick={handleDownloadPDF} className="theme-btn me-2">
                            Download PDF <i className="fas fa-file-pdf"></i>
                          </button>
                          {isCreator && !isEditing && (
                            <>
                              <button onClick={handleUpdate} className="theme-btn me-2">
                                Update <i className="fas fa-edit"></i>
                              </button>
                              <button onClick={handleDelete} className="theme-btn btn-danger">
                                Delete <i className="fas fa-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
};

export default EventDetails;