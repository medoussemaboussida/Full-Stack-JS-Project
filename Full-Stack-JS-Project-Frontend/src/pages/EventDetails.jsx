import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import { jwtDecode } from 'jwt-decode';

const BASE_URL = "http://localhost:5000";

const EventDetails = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [relatedEvents, setRelatedEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.id);
      } catch (error) {
        console.error("Token decoding error:", error);
        toast.error("Invalid session, please log in again");
      }
    }

    const fetchEvent = async () => {
      try {
        console.log(`Fetching event with ID: ${id}`);
        const response = await axios.get(`${BASE_URL}/events/getEvent/${id}`, {
          headers: { "Content-Type": "application/json" },
        });
        const eventData = response.data.event || response.data;
        console.log('Fetched event data:', eventData);
        setEvent(eventData);
        setFormData({
          title: eventData.title || '',
          description: eventData.description || '',
          start_date: eventData.start_date ? new Date(eventData.start_date).toISOString().split("T")[0] : '',
          end_date: eventData.end_date ? new Date(eventData.end_date).toISOString().split("T")[0] : '',
          event_type: eventData.event_type || 'in-person',
          localisation: eventData.localisation || '',
          lieu: eventData.lieu || '',
          online_link: eventData.online_link || '',
          contact_email: eventData.contact_email || '',
          imageUrl: eventData.imageUrl || '',
        });
        await fetchRelatedEvents(eventData.event_type);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching event:", error.response?.data || error.message);
        toast.error(`Loading error: ${error.message}`);
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const fetchRelatedEvents = async (eventType) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token || !eventType) {
        setRelatedEvents([]);
        return;
      }

      const response = await axios.post(
        `${BASE_URL}/events/related`,
        { 
          event_type: eventType, 
          status: ["upcoming", "ongoing"]
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const filteredEvents = response.data
        .filter((e) => e._id !== id)
        .slice(0, 3);
      setRelatedEvents(filteredEvents);
    } catch (error) {
      console.error("Error fetching related events:", error);
      setRelatedEvents([]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });
  };

  const handleImageError = (e) => {
    console.log('Image failed to load:', e.target.src);
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
      if (!token) throw new Error("No token found");
      const response = await axios.put(`${BASE_URL}/events/${id}`, formData, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const updatedEvent = response.data.event || response.data;
      setEvent(updatedEvent);
      setFormData({
        ...updatedEvent,
        start_date: new Date(updatedEvent.start_date).toISOString().split("T")[0],
        end_date: new Date(updatedEvent.end_date).toISOString().split("T")[0],
      });
      setIsEditing(false);
      toast.success("Update successful!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update error");
    }
  };

  const handleCancel = () => {
    setFormData({
      ...event,
      start_date: new Date(event.start_date).toISOString().split("T")[0],
      end_date: new Date(event.end_date).toISOString().split("T")[0],
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this event?")) return;
    try {
      const token = localStorage.getItem("jwt-token");
      await axios.delete(`${BASE_URL}/events/${id}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      toast.success("Deletion successful!");
      setTimeout(() => navigate("/events"), 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Deletion error");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem("jwt-token");
      const response = await axios.get(`${BASE_URL}/events/generatePDF/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${event.title}_Details.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error generating PDF");
    }
  };

  if (loading) return <div className="text-center py-5">Loading...</div>;
  if (!event) return <div className="text-center py-5">Event not found</div>;

  const isCreator = userId && event.created_by?._id === userId;
  const imageSrc = event.imageUrl ? `${BASE_URL}/${event.imageUrl.replace(/^\/+/, '')}` : "/assets/img/event/single.jpg";
  console.log('Image URL to display:', imageSrc);

  return (
    <>
      <div className="site-breadcrumb" style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Event Details</h2>
          <ul className="breadcrumb-menu">
            <li><Link to="/Home">Home</Link></li>
            <li className="active">Event Details</li>
          </ul>
        </div>
      </div>

      <div className="event-single py-120">
        <div className="container">
          <div className="event-single-wrap">
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="event-details">
                  <img
                    src={imageSrc}
                    alt={event.title}
                    onError={handleImageError}
                    className="img-fluid"
                  />
                  {isEditing ? (
                    <form onSubmit={handleFormSubmit} className="mt-4">
                      <div className="mb-3">
                        <label className="form-label">Title</label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleFormChange}
                          className="form-control"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Description</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleFormChange}
                          className="form-control"
                          rows="4"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          name="start_date"
                          value={formData.start_date}
                          onChange={handleFormChange}
                          className="form-control"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">End Date</label>
                        <input
                          type="date"
                          name="end_date"
                          value={formData.end_date}
                          onChange={handleFormChange}
                          className="form-control"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Event Type</label>
                        <select
                          name="event_type"
                          value={formData.event_type}
                          onChange={handleFormChange}
                          className="form-control"
                          required
                        >
                          <option value="in-person">In-Person</option>
                          <option value="online">Online</option>
                        </select>
                      </div>
                      {formData.event_type === "in-person" && (
                        <>
                          <div className="mb-3">
                            <label className="form-label">Location</label>
                            <input
                              type="text"
                              name="localisation"
                              value={formData.localisation}
                              onChange={handleFormChange}
                              className="form-control"
                              required
                            />
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Venue</label>
                            <input
                              type="text"
                              name="lieu"
                              value={formData.lieu}
                              onChange={handleFormChange}
                              className="form-control"
                              required
                            />
                          </div>
                        </>
                      )}
                      {formData.event_type === "online" && (
                        <div className="mb-3">
                          <label className="form-label">Online Link</label>
                          <input
                            type="url"
                            name="online_link"
                            value={formData.online_link}
                            onChange={handleFormChange}
                            className="form-control"
                            required
                          />
                        </div>
                      )}
                      <div className="mb-3">
                        <label className="form-label">Contact Email</label>
                        <input
                          type="email"
                          name="contact_email"
                          value={formData.contact_email}
                          onChange={handleFormChange}
                          className="form-control"
                          required
                        />
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
                        <h3 className="mb-2">About the Event</h3>
                        <p>{event.description || "No description available"}</p>
                      </div>
                      <div className="mb-4">
                        <h3 className="mb-2">Where is the Event?</h3>
                        <p>{event.lieu || event.online_link || "No location defined"}</p>
                      </div>
                      <div className="mb-4">
                        <h3 className="mb-2">Who is this Event For?</h3>
                        <p>
                          This event is open to everyone interested in contributing to{" "}
                          <strong>{event.title}</strong>. Contact{" "}
                          {event.created_by?.email || event.contact_email || "organizer unknown"} for more details.
                        </p>
                      </div>
                      {event.event_type === "in-person" && event.localisation && (
                        <div className="event-map mt-5">
                          <iframe
                            src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBxDeUBlVhmClKJGU1YLAsa5AzhgddjYJ4&q=${encodeURIComponent(event.localisation)}`}
                            style={{ border: 0, width: "100%", height: "400px" }}
                            allowFullScreen=""
                            loading="lazy"
                            title="Event Location"
                          ></iframe>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="col-lg-4">
                <div className="event-sidebar">
                  <div className="widget">
                    <div className="header">
                      <h4 className="title">Event Information</h4>
                      <p>Discover essential details about this event.</p>
                    </div>
                    <div className="event-single-info">
                      <div className="event-single-item">
                        <h5>Start Date</h5>
                        <p>
                          <i className="far fa-calendar-alt"></i>
                          {formatDate(event.start_date)}
                        </p>
                      </div>
                      <div className="event-single-item">
                        <h5>End Date</h5>
                        <p>
                          <i className="far fa-calendar-alt"></i>
                          {formatDate(event.end_date)}
                        </p>
                      </div>
                      <div className="event-single-item">
                        <h5>Type</h5>
                        <p>
                          <i className="far fa-info-circle"></i>
                          {event.event_type === "in-person" ? "In-Person" : "Online"}
                        </p>
                      </div>
                      <div className="event-single-item">
                        <h5>Location / Link</h5>
                        <p>
                          <i className="far fa-map-marker-alt"></i>
                          {event.event_type === "in-person" ? event.localisation : event.online_link || "Not defined"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="widget">
                    <h4 className="title">Organizer</h4>
                    <div className="event-single-author">
                      <div className="author-info">
                        <img
                          src={
                            event.created_by?.imageUrl
                              ? `${BASE_URL}/${event.created_by.imageUrl.replace(/^\/+/, '')}`
                              : "/assets/img/event/author.jpg"
                          }
                          alt={event.created_by?.username || "Organizer"}
                          onError={handleOrganizerImageError}
                          style={{ width: "200px", height: "200px", objectFit: "cover" }}
                        />
                        <h5>{event.created_by?.username || "Unknown Organizer"}</h5>
                        <p>
                          Contact {event.created_by?.email || event.contact_email || "unknown"} for more information.
                        </p>
                        <div className="mt-3">
                          <button onClick={handleDownloadPDF} className="theme-btn me-2">
                            Download PDF <i className="fas fa-file-pdf"></i>
                          </button>
                          {isCreator && !isEditing && (
                            <>
                              <button onClick={handleUpdate} className="theme-btn me-2">
                                Edit <i className="fas fa-edit"></i>
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
                  <div className="widget recent-post">
                    <h5 className="title">Related Events</h5>
                    {relatedEvents.length > 0 ? (
                      <ul>
                        {relatedEvents.map((relatedEvent) => (
                          <li key={relatedEvent._id}>
                            <Link to={`/events/${relatedEvent._id}`}>{relatedEvent.title}</Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No related events found.</p>
                    )}
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