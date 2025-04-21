import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

const BASE_URL = "http://localhost:5000";

const Ticket = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const token = localStorage.getItem("jwt-token");
        if (!token) {
          toast.error("Please log in to view your ticket");
          setTimeout(() => navigate("/login"), 2000);
          return;
        }

        const response = await axios.get(`${BASE_URL}/events/ticket/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTicket(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching ticket:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        toast.error(error.response?.data?.message || "Failed to load ticket");
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId, navigate]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Invalid Date"
      : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="container text-center py-5">
        <p>Loading ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container text-center py-5">
        <p>Ticket not found or you don't have permission to view it.</p>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/events")}
          style={{ borderRadius: "25px", padding: "10px 20px" }}
        >
          Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div
        className="card mx-auto"
        style={{
          maxWidth: "600px",
          borderRadius: "15px",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      >
        <div className="card-header bg-primary text-white text-center" style={{ padding: "20px" }}>
          <h3>Event Participation Ticket</h3>
          <p>Ticket ID: {ticket.ticketId}</p>
        </div>
        <div className="card-body" style={{ padding: "30px" }}>
          <h4 className="card-title">{ticket.event.title}</h4>
          <p className="card-text">
            <strong>Participant:</strong> {ticket.user.username} ({ticket.user.email})
          </p>
          <p className="card-text">
            <strong>Role:</strong> {ticket.isPartner ? "Partner" : "Participant"}
          </p>
          {ticket.association && (
            <p className="card-text">
              <strong>Association:</strong> {ticket.association.name}
            </p>
          )}
          <p className="card-text">
            <strong>Date:</strong> {formatDate(ticket.event.start_date)} - {formatDate(ticket.event.end_date)}
          </p>
          <p className="card-text">
            <strong>Time:</strong> {ticket.event.heure || "N/A"}
          </p>
          {ticket.event.event_type === "in-person" ? (
            <p className="card-text">
              <strong>Location:</strong> {ticket.event.localisation} - {ticket.event.lieu}
            </p>
          ) : (
            <p className="card-text">
              <strong>Online Link:</strong>{" "}
              <a href={ticket.event.online_link} target="_blank" rel="noopener noreferrer">
                {ticket.event.online_link}
              </a>
            </p>
          )}
          <p className="card-text">
            <strong>Event Type:</strong> {ticket.event.event_type === "in-person" ? "In-Person" : "Online"}
          </p>
        </div>
        <div className="card-footer text-center">
          <button
            className="btn btn-primary"
            onClick={() => navigate("/events")}
            style={{ borderRadius: "25px", padding: "10px 20px" }}
          >
            Back to Events
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default Ticket;