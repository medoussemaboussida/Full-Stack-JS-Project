import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { jsPDF } from "jspdf";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

// Use ngrok URL instead of localhost for accessibility from phone
const BASE_URL = "https://adce-197-244-14-194.ngrok-free.app";

const VerifyEvent = () => {
  const { eventId, userId } = useParams();
  const location = useLocation();
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPartner, setIsPartner] = useState(false);

  useEffect(() => {
    const verifyEvent = async () => {
      try {
        // Determine if it's a partner or participant verification
        const isPartnerVerification = location.pathname.includes("verifyPartner");
        setIsPartner(isPartnerVerification);
        const endpoint = isPartnerVerification
          ? `${BASE_URL}/events/verifyPartner/${eventId}/${userId}`
          : `${BASE_URL}/events/verifyParticipation/${eventId}/${userId}`;

        console.log(`Fetching verification from: ${endpoint}`);
        const response = await axios.get(endpoint);
        console.log(`Verification response:`, response.data);
        setVerificationResult(response.data);

        if (response.data.isParticipating || response.data.isPartner) {
          toast.success(response.data.message || "Verification successful!");
        } else {
          toast.error(response.data.message || "Verification failed.");
        }
      } catch (error) {
        console.error(`Error verifying ${isPartner ? "partner" : "participation"}:`, {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        const errorMessage =
          error.response?.data?.message || `Failed to verify ${isPartner ? "partner" : "participation"}`;
        toast.error(errorMessage);
        setVerificationResult({ message: errorMessage, isParticipating: false, isPartner: false });
      } finally {
        setLoading(false);
      }
    };

    verifyEvent();
  }, [eventId, userId, location.pathname]);

  // Function to generate and download the PDF ticket
  const downloadTicketPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`${isPartner ? "Partner" : "Participation"} Ticket`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Event: ${verificationResult.eventTitle}`, 20, 40);
    doc.text(`Name: ${verificationResult.username}`, 20, 50);
    doc.text(`Type: ${isPartner ? "Partner" : "Participant"}`, 20, 60);
    doc.text(`Ticket ID: ${verificationResult.ticketId}`, 20, 70);
    doc.text(
      `Event Date: ${new Date(verificationResult.startDate).toLocaleDateString("en-GB")}`,
      20,
      80
    );
    doc.save(`ticket_${verificationResult.ticketId}.pdf`);
  };

  return (
    <div
      className="container py-5"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
      }}
    >
      <div
        className="card shadow-lg"
        style={{
          maxWidth: "600px",
          width: "100%",
          borderRadius: "15px",
          padding: "30px",
          textAlign: "center",
          backgroundColor: "#fff",
          boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 className="mb-4" style={{ color: "#333", fontWeight: "bold" }}>
          {isPartner ? "Partner Verification" : "Participation Verification"}
        </h2>
        {loading ? (
          <p style={{ fontSize: "18px", color: "#666" }}>Loading...</p>
        ) : verificationResult ? (
          <div>
            <div
              style={{
                fontSize: "80px",
                marginBottom: "20px",
                color:
                  verificationResult.isParticipating || verificationResult.isPartner
                    ? "#28a745"
                    : "#dc3545",
              }}
            >
              {verificationResult.isParticipating || verificationResult.isPartner ? (
                <i className="fas fa-check-circle"></i>
              ) : (
                <i className="fas fa-times-circle"></i>
              )}
            </div>
            <p
              style={{
                fontSize: "18px",
                color: "#333",
                marginBottom: "20px",
              }}
            >
              {verificationResult.message}
            </p>
            {(verificationResult.isParticipating || verificationResult.isPartner) &&
              verificationResult.ticketId && (
                <div
                  style={{
                    border: "2px dashed #ff7f5d",
                    padding: "20px",
                    borderRadius: "10px",
                    backgroundColor: "#fff",
                    marginTop: "20px",
                  }}
                >
                  <h4 style={{ color: "#333", marginBottom: "15px" }}>
                    {isPartner ? "Partner" : "Participation"} Ticket
                  </h4>
                  <p style={{ fontSize: "16px", color: "#666" }}>
                    <strong>Event:</strong> {verificationResult.eventTitle || "N/A"}
                  </p>
                  <p style={{ fontSize: "16px", color: "#666" }}>
                    <strong>Name:</strong> {verificationResult.username || "N/A"}
                  </p>
                  <p style={{ fontSize: "16px", color: "#666" }}>
                    <strong>Type:</strong> {isPartner ? "Partner" : "Participant"}
                  </p>
                  <p style={{ fontSize: "16px", color: "#666" }}>
                    <strong>Ticket ID:</strong> {verificationResult.ticketId}
                  </p>
                  <p style={{ fontSize: "16px", color: "#666" }}>
                    <strong>Event Date:</strong>{" "}
                    {verificationResult.startDate
                      ? new Date(verificationResult.startDate).toLocaleDateString("en-GB")
                      : "N/A"}
                  </p>
                  <button
                    onClick={downloadTicketPDF}
                    className="theme-btn"
                    style={{
                      backgroundColor: "#ff7f5d",
                      color: "#fff",
                      padding: "10px 20px",
                      borderRadius: "25px",
                      border: "none",
                      fontWeight: "500",
                      transition: "background-color 0.3s ease, transform 0.3s ease",
                      cursor: "pointer",
                      marginTop: "20px",
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
                    Download Ticket <i className="fas fa-download" style={{ marginLeft: "8px" }}></i>
                  </button>
                </div>
              )}
          </div>
        ) : (
          <p style={{ fontSize: "18px", color: "#666" }}>
            No verification result available.
          </p>
        )}
      </div>
      <ToastContainer />
    </div>
  );
};

export default VerifyEvent;