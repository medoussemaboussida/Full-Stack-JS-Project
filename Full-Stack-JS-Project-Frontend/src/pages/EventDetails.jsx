import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import { jwtDecode } from 'jwt-decode';
import jsPDF from 'jspdf';
import { Helmet } from 'react-helmet';

const BASE_URL = "http://localhost:5000"; // Local backend URL

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [relatedEvents, setRelatedEvents] = useState([]);
  const [imageSrc, setImageSrc] = useState("/assets/img/event/single.jpg");
  const [showParticipants, setShowParticipants] = useState(false);
  const [promoContent, setPromoContent] = useState('');

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.id);
        setUserRole(decoded.role);
      } catch (error) {
        console.error("Token decoding error:", error);
        toast.error("Invalid session, please log in again", { autoClose: 3000 });
        setTimeout(() => navigate("/login"), 3000);
      }
    }

    const fetchEvent = async () => {
      try {
        console.log(`Fetching event with ID: ${id}`);
        const response = await axios.get(`${BASE_URL}/events/getEvent/${id}`, {
          headers: { "Content-Type": "application/json" },
          timeout: 10000,
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
          heure: eventData.heure || '',
          hasPartners: eventData.hasPartners || false,
        });

        const url = eventData.imageUrl ? `${BASE_URL}/${eventData.imageUrl.replace(/^\/+/, '')}` : "/assets/img/event/single.jpg";
        console.log('Image URL to display:', url);
        const img = new Image();
        img.src = url;
        img.onload = () => setImageSrc(url);
        img.onerror = () => {
          console.log(`Failed to load image: ${url}, falling back to default`);
          setImageSrc("/assets/img/event/single.jpg");
        };

        await fetchRelatedEvents(eventData.event_type, eventData.localisation);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching event:", error.response?.data || error.message);
        toast.error(`Loading error: ${error.message}`, { autoClose: 3000 });
        setImageSrc("/assets/img/event/single.jpg");
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, navigate]);

  const fetchRelatedEvents = async (eventType, localisation) => {
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) {
        setRelatedEvents([]);
        return;
      }

      const requestBody = {
        status: ["upcoming", "ongoing"],
      };

      if (eventType === "in-person" && localisation) {
        requestBody.event_type = "in-person";
        requestBody.localisation = localisation;
      } else if (eventType === "online") {
        requestBody.event_type = "online";
      } else {
        setRelatedEvents([]);
        return;
      }

      const response = await axios.post(
        `${BASE_URL}/events/related`,
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
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

  const handleOrganizerImageError = (e) => {
    e.target.src = "/assets/img/event/author.jpg";
  };

  const handleUpdate = () => setIsEditing(true);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("jwt-token");
      if (!token) throw new Error("No token found");

      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("start_date", formData.start_date);
      formDataToSend.append("end_date", formData.end_date);
      formDataToSend.append("event_type", formData.event_type);
      if (formData.event_type === "in-person") {
        formDataToSend.append("localisation", formData.localisation);
        formDataToSend.append("lieu", formData.lieu);
      } else {
        formDataToSend.append("online_link", formData.online_link);
      }
      formDataToSend.append("heure", formData.heure);
      formDataToSend.append("contact_email", formData.contact_email);
      formDataToSend.append("hasPartners", formData.hasPartners);

      const response = await axios.put(`${BASE_URL}/events/updateEvent/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        timeout: 10000,
        validateStatus: (status) => {
          return status >= 200 && status < 300;
        },
      });

      const updatedEvent = response.data.data || response.data;
      console.log("Update response:", response.status, response.data);

      setEvent(updatedEvent);
      setFormData({
        title: updatedEvent.title || '',
        description: updatedEvent.description || '',
        start_date: updatedEvent.start_date ? new Date(updatedEvent.start_date).toISOString().split("T")[0] : '',
        end_date: updatedEvent.end_date ? new Date(updatedEvent.end_date).toISOString().split("T")[0] : '',
        event_type: updatedEvent.event_type || 'in-person',
        localisation: updatedEvent.localisation || '',
        lieu: updatedEvent.lieu || '',
        online_link: updatedEvent.online_link || '',
        contact_email: updatedEvent.contact_email || '',
        heure: updatedEvent.heure || '',
        hasPartners: updatedEvent.hasPartners || false,
      });
      setIsEditing(false);
      toast.success("Update successful!", { autoClose: 2000 });

      const url = updatedEvent.imageUrl ? `${BASE_URL}/${updatedEvent.imageUrl.replace(/^\/+/, '')}` : "/assets/img/event/single.jpg";
      console.log('Image URL to display:', url);
      const img = new Image();
      img.src = url;
      img.onload = () => setImageSrc(url);
      img.onerror = () => {
        console.log(`Failed to load image: ${url}, falling back to default`);
        setImageSrc("/assets/img/event/single.jpg");
      };
    } catch (error) {
      console.error("Error updating event:", error);
      if (error.code === "ECONNABORTED") {
        toast.error("Request timed out. Please check your network connection and try again.", { autoClose: 3000 });
      } else if (error.response) {
        const errorMessage = error.response.data?.message || "Update error";
        console.log("Backend error details:", error.response.status, error.response.data);
        toast.error(errorMessage, { autoClose: 3000 });
      } else {
        toast.error(error.message || "Network error: Unable to connect to the server", { autoClose: 3000 });
      }
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
      await axios.delete(`${BASE_URL}/events/deleteEvent/${id}`, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      toast.success("Deletion successful!", { autoClose: 2000 });
      setTimeout(() => navigate("/events"), 2000);
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error(error.response?.data?.message || "Deletion error", { autoClose: 3000 });
    }
  };

  const getBase64Image = (url, callback) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/jpeg");
      callback(dataURL);
    };
    img.onerror = () => {
      const fallbackImg = new Image();
      fallbackImg.crossOrigin = "Anonymous";
      fallbackImg.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = fallbackImg.width;
        canvas.height = fallbackImg.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(fallbackImg, 0, 0);
        const dataURL = canvas.toDataURL("image/jpeg");
        callback(dataURL);
      };
      fallbackImg.onerror = () => callback(null);
      fallbackImg.src = "/assets/img/event/single.jpg";
    };
    img.src = url;
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const marginLeft = 40;
      const marginRight = 40;
      const marginTop = 40;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = marginTop;

      doc.setFont('Times', 'bold');
      doc.setFontSize(16);
      doc.text('Event Details', doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
      yPosition += 40;

      getBase64Image(imageSrc, (base64Image) => {
        if (base64Image) {
          const imgWidth = 200;
          const imgHeight = (imgWidth * 3) / 4;
          const xPosition = (doc.internal.pageSize.width - imgWidth) / 2;
          doc.addImage(base64Image, 'JPEG', xPosition, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 20;
        } else {
          yPosition += 20;
        }

        const addField = (label, value) => {
          const sanitizedValue = String(value || 'N/A').replace(/[^\x20-\x7E]/g, '');
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = marginTop;
          }
          doc.setFont('Times', 'bold');
          doc.setFontSize(12);
          doc.text(`${label}:`, marginLeft, yPosition);
          doc.setFont('Times', 'normal');
          const textWidth = doc.internal.pageSize.width - marginLeft - marginRight - 80;
          const splitText = doc.splitTextToSize(sanitizedValue, textWidth);
          splitText.forEach((line, index) => {
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = marginTop;
            }
            doc.text(line, marginLeft + 80, yPosition);
            yPosition += 14;
          });
          yPosition += 10;
        };

        addField('Title', event.title);
        addField('Description', event.description);
        addField('Start Date', event.start_date ? formatDate(event.start_date) : 'N/A');
        addField('End Date', event.end_date ? formatDate(event.end_date) : 'N/A');
        addField('Time', event.heure || 'N/A');
        addField('Event Type', event.event_type === "in-person" ? 'In-Person' : 'Online');
        addField('Organizer', event.created_by?.username || 'Unknown Organizer');
        addField('Contact', event.contact_email || event.created_by?.email || 'N/A');
        addField('Participants', `${event.participants?.length || 1} / ${event.max_participants || 'No limit'}`);
        addField('Accept Partners', event.hasPartners ? 'YES' : 'NO');

        doc.save(`${event.title}_Details.pdf`);
        toast.success("PDF downloaded successfully!", { autoClose: 2000 });
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error generating PDF", { autoClose: 3000 });
    }
  };

  const handleShareOnFacebook = async () => {
    try {
      const pageId = '239959405871715';
      const accessToken = 'EAAERIQJ4OLsBOyFLCXOZC6kRSJorQl5sFtGXXDLZCleXNNm400sq7H0ZB8HAzPjs1hL6ereJweE2gGtaZAgw3XhOKrFymMX5sYu1lCs962rE8bsvdCig5DiAipkmoZAaGbsJqFbLRW0JaHaLp8FGMwHec691FC9mYAilEQgbfPnZADfARmLVkeXKB26UAgTR0ZD';

      if (!accessToken) {
        throw new Error("Facebook access token is missing.");
      }

      // Include event details in the message without a link
      const message = `${event.title}\n\n${event.description || 'Check out this event!'}\n\nDate: ${formatDate(event.start_date)} at ${event.heure || 'TBD'}\nLocation: ${event.event_type === 'in-person' ? event.lieu || 'TBD' : event.online_link || 'Online'}\n\nVisit our website for more details!`;

      const postData = {
        message: message,
        access_token: accessToken,
      };

      const postResponse = await axios.post(
        `https://graph.facebook.com/v20.0/${pageId}/feed`,
        postData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Post created successfully:', postResponse.data);
      toast.success("Event shared successfully on your Facebook page!", { autoClose: 2000 });
    } catch (error) {
      console.error("Error sharing on Facebook:", error.response?.data || error.message);
      toast.error("Failed to share event on Facebook: " + (error.response?.data?.error?.message || error.message), { autoClose: 3000 });
    }
  };

  const generatePromoContent = () => {
    try {
      const { title, description, start_date, lieu, online_link, event_type, heure } = event;
      const shortDescription = description?.slice(0, 100) || 'An exciting event awaits!';
      const location = event_type === 'in-person' ? lieu || 'TBD' : online_link || 'Online';
      const formattedDate = formatDate(start_date);
      const time = heure || 'Check details';

      const promoText = `Join us for "${title}" on ${formattedDate} at ${time}! ${shortDescription} 📍 ${location}. Visit our website for more details! #Event`;

      const finalText = promoText.length > 280 ? `${promoText.slice(0, 275)}...` : promoText;

      setPromoContent(finalText);
      toast.success("Promotional content generated!", { autoClose: 2000 });
    } catch (error) {
      console.error("Error generating promo content:", error);
      toast.error("Failed to generate promotional content", { autoClose: 3000 });
    }
  };

  if (loading) return <div className="text-center py-5">Loading...</div>;
  if (!event) return <div className="text-center py-5">Event not found</div>;

  const isCreator = userId && event.created_by?._id === userId;

  return (
    <>
      <Helmet>
        <title>{event.title || "Event Details"}</title>
        <meta property="og:title" content={event.title || "Event Details"} />
        <meta property="og:description" content={event.description || "Check out this event!"} />
        <meta
          property="og:image"
          content="https://via.placeholder.com/1200x630.png?text=Event+Image" // Public fallback image
        />
        <meta property="og:url" content="https://yourdomain.com/events" /> {/* Replace with production URL later */}
        <meta property="og:type" content="website" />
      </Helmet>

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
                  <img src={imageSrc} alt={event.title} className="img-fluid" />
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
                        <label className="form-label">Time</label>
                        <input
                          type="time"
                          name="heure"
                          value={formData.heure}
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
                      <div className="mb-3">
                        <label className="form-label">Accept Partners</label>
                        <select
                          name="hasPartners"
                          value={formData.hasPartners.toString()}
                          onChange={handleFormChange}
                          className="form-control"
                          required
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
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
                        <h5>Time</h5>
                        <p>
                          <i className="far fa-clock"></i>
                          {event.heure || "N/A"}
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
                        <h5>Participants</h5>
                        <p>
                          <i className="far fa-users"></i>
                          {event.participants?.length || 1} / {event.max_participants || "No limit"}
                        </p>
                      </div>
                      <div className="event-single-item">
                        <h5>Accept Partners</h5>
                        <p>
                          <i className="far fa-handshake"></i>
                          {event.hasPartners ? "YES" : "NO"}
                        </p>
                      </div>
                      {event.hasPartners && userRole === "association_member" && (
                        <div className="event-single-item">
                          <div
                            onClick={() => setShowParticipants(!showParticipants)}
                            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                          >
                            <h5 style={{ margin: 0 }}>Participants List</h5>
                            <i
                              className={`fas fa-chevron-${showParticipants ? "up" : "down"} ml-2`}
                              style={{ marginLeft: "8px" }}
                            ></i>
                          </div>
                          {showParticipants && (
                            <>
                              {event.participants?.length > 0 ? (
                                event.participants.map((participant, index) => (
                                  <p key={index}>
                                    <i className="far fa-list"></i>
                                    {index + 1}. {participant.username || "Unknown"}
                                  </p>
                                ))
                              ) : (
                                <p>No participants yet.</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
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
                          Contact {event.created_by?.email || event.contact_email || "unknown"} for more details.
                        </p>
                        <div className="mt-3">
                          <button onClick={handleDownloadPDF} className="theme-btn me-2">
                            Download PDF <i className="fas fa-file-pdf"></i>
                          </button>
                          <button onClick={handleShareOnFacebook} className="theme-btn me-2" style={{ backgroundColor: '#3b5998' }}>
                            Share on FB <i className="fab fa-facebook-f"></i>
                          </button>
                          {isCreator && !isEditing && (
                            <>
                              <button onClick={handleUpdate} className="theme-btn me-2">
                                Edit <i className="fas fa-edit"></i>
                              </button>
                              <button onClick={handleDelete} className="theme-btn btn-danger me-2">
                                Delete <i className="fas fa-trash"></i>
                              </button>
                              <button onClick={generatePromoContent} className="theme-btn">
                                Generate Promo <i className="fas fa-bullhorn"></i>
                              </button>
                            </>
                          )}
                        </div>
                        {isCreator && promoContent && (
                          <div className="mt-3">
                            <h5>Promotional Content</h5>
                            <textarea
                              className="form-control"
                              rows="4"
                              value={promoContent}
                              readOnly
                              style={{ resize: "none" }}
                            />
                            <button
                              className="theme-btn mt-2"
                              onClick={() => navigator.clipboard.writeText(promoContent).then(() => toast.success("Copied to clipboard!", { autoClose: 2000 }))}
                            >
                              Copy Text <i className="fas fa-copy"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="widget recent-post">
                    <h5 className="title">Related Events</h5>
                    {relatedEvents.length > 0 ? (
                      <ul>
                        {relatedEvents.map((relatedEvent) => (
                          <li key={relatedEvent._id} className="related-event-item">
                            <Link to={`/events/${relatedEvent._id}`}>
                              <strong>{relatedEvent.title}</strong>
                            </Link>
                            <p className="related-event-location">
                              <i className="fas fa-map-marker-alt me-2"></i>
                              {relatedEvent.event_type === "in-person" ? (
                                <>
                                  {relatedEvent.localisation || "Location not specified"}
                                  {relatedEvent.distance === 0
                                    ? " (Same Location)"
                                    : relatedEvent.distance
                                    ? ` (Nearby, ~${Math.round(relatedEvent.distance)} km)`
                                    : ""}
                                </>
                              ) : (
                                relatedEvent.online_link || "Online link not specified"
                              )}
                            </p>
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