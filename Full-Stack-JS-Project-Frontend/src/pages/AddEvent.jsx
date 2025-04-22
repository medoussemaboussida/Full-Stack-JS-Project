import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

const BASE_URL = "http://localhost:5000";

const tunisianGovernorates = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba",
  "Kairouan", "Kasserine", "Kébili", "Kef", "Mahdia", "Manouba", "Médenine",
  "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine",
  "Tozeur", "Tunis", "Zaghouan"
].sort();

const emailDomains = [
  "@gmail.com", "@yahoo.fr", "@hotmail.com", "@outlook.com", "@live.fr",
  "@aol.com", "@icloud.com", "@mail.com", "@protonmail.com", "@yandex.com",
  "@yahoo.com", "@msn.com"
];

const AddEvent = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "in-person",
    localisation: "",
    lieu: "",
    online_link: "",
    heure: "",
    contact_email: "",
    image: null,
    hasPartners: false,
    partners: [],
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [imagePreview, setImagePreview] = useState("/assets/img/about/image.png");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        if (decoded.exp < currentTime) {
          toast.error("Your session has expired, please log in again", { autoClose: 3000 });
          localStorage.removeItem("jwt-token");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }
        setUserRole(decoded.role);
      } catch (error) {
        console.error("Invalid token:", error);
        toast.error("Invalid token, please log in again", { autoClose: 3000 });
        localStorage.removeItem("jwt-token");
        setTimeout(() => navigate("/login"), 3000);
      }
    } else {
      toast.error("You must be logged in to access this page", { autoClose: 3000 });
      setTimeout(() => navigate("/login"), 3000);
    }
  }, [navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === "hasPartners" ? value === "true" : value;
    setFormData({ ...formData, [name]: newValue });
    setErrors({ ...errors, [name]: "" });
  };

  const handleReset = () => {
    setFormData({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      event_type: "in-person",
      localisation: "",
      lieu: "",
      online_link: "",
      heure: "",
      contact_email: "",
      image: null,
      hasPartners: false,
      partners: [],
    });
    setImagePreview("/assets/img/about/image.png");
    setErrors({});
    setServerError(null);
  };

  // Function to generate image using Pollinations AI
  const generateImageFromDescription = async () => {
    if (!formData.description) {
      toast.error("Please provide a description to generate an image", { autoClose: 3000 });
      return;
    }

    setIsGeneratingImage(true);
    const prompt = `A vivid scene representing an event titled "${formData.title || "Event"}". ${
      formData.event_type === "in-person"
        ? `The event takes place in ${formData.localisation || "a Tunisian city"}, at ${formData.lieu || "a venue"}. `
        : "The event is an online gathering. "
    }Description: ${formData.description}. The atmosphere is engaging, vibrant, and reflects the event's purpose.`;
    
    const encodedPrompt = encodeURIComponent(prompt);
    const apiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600`;

    try {
      // Since Pollinations AI returns an image directly, set the image preview to the API URL
      setImagePreview(apiUrl);
      toast.success("Image generated successfully!", { autoClose: 2000 });
      
      // Optionally, fetch the image as a blob to store it in formData.image
      const response = await fetch(apiUrl);
      const blob = await response.blob();
      const file = new File([blob], "generated-image.png", { type: "image/png" });
      setFormData({ ...formData, image: file });
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image. Please try again.", { autoClose: 3000 });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setServerError(null);

    const token = localStorage.getItem("jwt-token");
    if (!token) {
      toast.error("You must be logged in to add an event", { autoClose: 3000 });
      setTimeout(() => navigate("/login"), 3000);
      setIsSubmitting(false);
      return;
    }
    if (userRole !== "association_member") {
      toast.error("Only association members can add an event", { autoClose: 3000 });
      setIsSubmitting(false);
      return;
    }

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
    if (formData.image) {
      formDataToSend.append("image", formData.image);
    }
    formDataToSend.append("hasPartners", formData.hasPartners);

    try {
      const response = await axios.post(`${BASE_URL}/events/addEvent`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const successMessage = response.data.message + (formData.hasPartners ? " Emails will be sent to association members." : "");
      toast.success(successMessage, { autoClose: 2000 });
      handleReset();
      setTimeout(() => navigate("/events"), 2000);
    } catch (error) {
      console.log("Full error response:", error.response);
      if (error.response?.status === 403) {
        toast.error("Your session has expired, please log in again", { autoClose: 3000 });
        localStorage.removeItem("jwt-token");
        setTimeout(() => navigate("/login"), 3000);
      } else if (error.response?.status === 400) {
        if (Array.isArray(error.response?.data?.errors)) {
          const backendErrors = error.response.data.errors.reduce((acc, err) => {
            const field = err.toLowerCase().includes("title") ? "title" :
                          err.toLowerCase().includes("description") ? "description" :
                          err.toLowerCase().includes("start date") ? "start_date" :
                          err.toLowerCase().includes("end date") ? "end_date" :
                          err.toLowerCase().includes("event type") ? "event_type" :
                          err.toLowerCase().includes("location") ? "localisation" :
                          err.toLowerCase().includes("venue") ? "lieu" :
                          err.toLowerCase().includes("online link") ? "online_link" :
                          err.toLowerCase().includes("email") ? "contact_email" : "";
            if (field) acc[field] = err;
            return acc;
          }, {});
          setErrors(backendErrors);
        } else {
          const errorMessage = error.response?.data?.message || "Validation error occurred";
          setServerError(errorMessage);
          toast.error(errorMessage, { autoClose: 3000 });
        }
      } else if (error.response?.status === 500 && error.response?.data?.message.includes("emails")) {
        toast.warn(error.response.data.message, { autoClose: 5000 });
      } else {
        const errorMessage = error.response?.data?.message || "An error occurred while adding the event";
        setServerError(errorMessage);
        toast.error(errorMessage, { autoClose: 3000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="site-breadcrumb" style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Add a New Event</h2>
          <ul className="breadcrumb-menu">
            <li><Link to="/Home">Home</Link></li>
            <li className="active">Add an Event</li>
          </ul>
        </div>
      </div>

      <div className="become-volunteer py-5">
        <div className="container">
          <ToastContainer />
          <div className="become-volunteer-wrap">
            <div className="row align-items-center">
              <div className="col-lg-6">
                <div className="become-volunteer-img">
                  <img
                    src={imagePreview}
                    alt="Event Preview"
                    className="img-fluid rounded"
                    style={{
                      width: "100%",
                      height: "auto",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="become-volunteer-form">
                  <h2>Add an Event</h2>
                  <p>Fill out the form below to create a new event.</p>
                  {serverError && (
                    <p style={{ color: "#dc3545", fontSize: "14px", marginBottom: "15px" }}>
                      {serverError}
                    </p>
                  )}
                  <form onSubmit={onSubmit}>
                    <div className="row">
                      <div className="col-md-12" style={{ marginBottom: "15px" }}>
                        <input
                          type="text"
                          name="title"
                          className="form-control"
                          placeholder="Event Title"
                          value={formData.title}
                          onChange={handleChange}
                          style={{ borderColor: errors.title ? "#dc3545" : "#ced4da" }}
                        />
                        {errors.title && (
                          <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                            {errors.title}
                          </p>
                        )}
                      </div>
                      <div className="col-md-12" style={{ marginBottom: "15px" }}>
                        <textarea
                          name="description"
                          className="form-control"
                          cols="30"
                          rows="5"
                          placeholder="Description"
                          value={formData.description}
                          onChange={handleChange}
                          style={{ borderColor: errors.description ? "#dc3545" : "#ced4da" }}
                        />
                        {errors.description && (
                          <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                            {errors.description}
                          </p>
                        )}
                      </div>
                      <div className="col-md-12" style={{ marginBottom: "15px" }}>
                        <button
                          type="button"
                          onClick={generateImageFromDescription}
                          className="theme-btn"
                          disabled={isGeneratingImage || !formData.description}
                          style={{
                            backgroundColor: "#28a745",
                            color: "#fff",
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: "5px",
                            cursor: isGeneratingImage || !formData.description ? "not-allowed" : "pointer",
                          }}
                        >
                          {isGeneratingImage ? "Generating Image..." : "Generate Image from Description"}
                        </button>
                      </div>
                      <div className="col-md-6" style={{ marginBottom: "15px" }}>
                        <label htmlFor="start_date" style={{ marginBottom: "5px", display: "block" }}>
                          Start Date
                        </label>
                        <input
                          type="date"
                          id="start_date"
                          name="start_date"
                          className="form-control"
                          value={formData.start_date}
                          onChange={handleChange}
                          style={{ borderColor: errors.start_date ? "#dc3545" : "#ced4da" }}
                        />
                        {errors.start_date && (
                          <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                            {errors.start_date}
                          </p>
                        )}
                      </div>
                      <div className="col-md-6" style={{ marginBottom: "15px" }}>
                        <label htmlFor="end_date" style={{ marginBottom: "5px", display: "block" }}>
                          End Date
                        </label>
                        <input
                          type="date"
                          id="end_date"
                          name="end_date"
                          className="form-control"
                          value={formData.end_date}
                          onChange={handleChange}
                          style={{ borderColor: errors.end_date ? "#dc3545" : "#ced4da" }}
                        />
                        {errors.end_date && (
                          <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                            {errors.end_date}
                          </p>
                        )}
                      </div>
                      <div className="col-md-6" style={{ marginBottom: "15px" }}>
                        <label htmlFor="event_type" style={{ marginBottom: "5px", display: "block" }}>
                          Event Type
                        </label>
                        <select
                          id="event_type"
                          name="event_type"
                          className="form-control"
                          value={formData.event_type}
                          onChange={handleChange}
                          style={{
                            borderColor: errors.event_type ? "#dc3545" : "#ced4da",
                            padding: "10px",
                            borderRadius: "5px",
                            fontSize: "16px",
                            color: "#333",
                            outline: "none",
                            transition: "all 0.3s ease",
                          }}
                        >
                          <option value="in-person">In-Person</option>
                          <option value="online">Online</option>
                        </select>
                        {errors.event_type && (
                          <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                            {errors.event_type}
                          </p>
                        )}
                      </div>
                      <div className="col-md-6" style={{ marginBottom: "15px" }}>
                        <label htmlFor="heure" style={{ marginBottom: "5px", display: "block" }}>
                          Time
                        </label>
                        <input
                          type="time"
                          name="heure"
                          className="form-control"
                          placeholder="Time (HH:MM)"
                          value={formData.heure}
                          onChange={handleChange}
                          style={{ borderColor: errors.heure ? "#dc3545" : "#ced4da" }}
                        />
                        {errors.heure && (
                          <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                            {errors.heure}
                          </p>
                        )}
                      </div>
                      {formData.event_type === "in-person" && (
                        <>
                          <div className="col-md-6" style={{ marginBottom: "15px" }}>
                            <label htmlFor="localisation" style={{ marginBottom: "5px", display: "block" }}>
                              Location
                            </label>
                            <select
                              id="localisation"
                              name="localisation"
                              className="form-control"
                              value={formData.localisation}
                              onChange={handleChange}
                              style={{
                                borderColor: errors.localisation ? "#dc3545" : "#ced4da",
                                padding: "10px",
                                borderRadius: "5px",
                                fontSize: "16px",
                                color: "#333",
                                outline: "none",
                                transition: "all 0.3s ease",
                              }}
                            >
                              <option value="">Select a Governorate</option>
                              {tunisianGovernorates.map((governorate) => (
                                <option key={governorate} value={governorate}>
                                  {governorate}
                                </option>
                              ))}
                            </select>
                            {errors.localisation && (
                              <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                                {errors.localisation}
                              </p>
                            )}
                          </div>
                          <div className="col-md-6" style={{ marginBottom: "15px" }}>
                            <label htmlFor="lieu" style={{ marginBottom: "5px", display: "block" }}>
                              Venue
                            </label>
                            <input
                              type="text"
                              id="lieu"
                              name="lieu"
                              className="form-control"
                              placeholder="Venue (e.g., hall)"
                              value={formData.lieu}
                              onChange={handleChange}
                              style={{ borderColor: errors.lieu ? "#dc3545" : "#ced4da" }}
                            />
                            {errors.lieu && (
                              <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                                {errors.lieu}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                      {formData.event_type === "online" && (
                        <div className="col-md-12" style={{ marginBottom: "15px" }}>
                          <label htmlFor="online_link" style={{ marginBottom: "5px", display: "block" }}>
                            Online Link
                          </label>
                          <input
                            type="url"
                            id="online_link"
                            name="online_link"
                            className="form-control"
                            placeholder="Online Event Link (e.g., https://zoom.us/...)"
                            value={formData.online_link}
                            onChange={handleChange}
                            style={{ borderColor: errors.online_link ? "#dc3545" : "#ced4da" }}
                          />
                          {errors.online_link && (
                            <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                              {errors.online_link}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="col-md-12" style={{ marginBottom: "15px" }}>
                        <label htmlFor="contact_email" style={{ marginBottom: "5px", display: "block" }}>
                          Contact Email
                        </label>
                        <input
                          type="email"
                          id="contact_email"
                          name="contact_email"
                          className="form-control"
                          placeholder="Contact Email"
                          list="emailSuggestions"
                          value={formData.contact_email}
                          onChange={handleChange}
                          style={{ borderColor: errors.contact_email ? "#dc3545" : "#ced4da" }}
                        />
                        <datalist id="emailSuggestions">
                          {emailDomains.map((domain) => (
                            <option key={domain} value={domain} />
                          ))}
                        </datalist>
                        {errors.contact_email && (
                          <p style={{ color: "#dc3545", fontSize: "14px", marginTop: "5px" }}>
                            {errors.contact_email}
                          </p>
                        )}
                      </div>
                      <div className="col-md-12" style={{ marginBottom: "15px" }}>
                        <label htmlFor="hasPartners" style={{ marginBottom: "5px", display: "block" }}>
                          Notify Partner Associations?
                        </label>
                        <select
                          id="hasPartners"
                          name="hasPartners"
                          className="form-control"
                          value={formData.hasPartners.toString()}
                          onChange={handleChange}
                          style={{
                            borderColor: errors.hasPartners ? "#dc3545" : "#ced4da",
                            padding: "10px",
                            borderRadius: "5px",
                            fontSize: "16px",
                            color: "#333",
                            outline: "none",
                            transition: "all 0.3s ease",
                          }}
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                        <small style={{ color: "#6c757d", fontSize: "12px" }}>
                          If "Yes", other association members will be notified by email.
                        </small>
                      </div>
                      <div className="col-md-12" style={{ marginBottom: "15px" }}>
                        <label htmlFor="image" style={{ marginBottom: "5px", display: "block" }}>
                          Event Image
                        </label>
                        <input
                          type="file"
                          id="image"
                          name="image"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="form-control"
                        />
                      </div>
                      <div className="col-md-12">
                        <button
                          type="submit"
                          className="theme-btn"
                          disabled={isSubmitting}
                          style={{
                            backgroundColor: "#ff7f5d",
                            color: "#fff",
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: "5px",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                          }}
                        >
                          {isSubmitting ? "Adding..." : "Add Event"}
                        </button>
                        <button
                          type="button"
                          onClick={handleReset}
                          className="theme-btn"
                          style={{
                            backgroundColor: "#6c757d",
                            color: "#fff",
                            padding: "10px 20px",
                            border: "none",
                            borderRadius: "5px",
                            marginLeft: "10px",
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddEvent;