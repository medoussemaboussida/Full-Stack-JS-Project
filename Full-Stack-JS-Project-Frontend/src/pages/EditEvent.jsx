import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
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
  "@gmail.com",
  "@yahoo.fr",
  "@hotmail.com",
  "@outlook.com",
  "@live.fr",
  "@aol.com",
  "@icloud.com",
  "@mail.com",
  "@protonmail.com",
  "@yandex.com",
  "@yahoo.com",
  "@msn.com"
];

const EditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [imagePreview, setImagePreview] = useState("/assets/img/about/image.png");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/events/getEvent/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("jwt-token")}`,
          },
        });
        const event = response.data;
        setFormData({
          title: event.title || "",
          description: event.description || "",
          start_date: event.start_date ? new Date(event.start_date).toISOString().split("T")[0] : "",
          end_date: event.end_date ? new Date(event.end_date).toISOString().split("T")[0] : "",
          event_type: event.event_type || "in-person",
          localisation: event.localisation || "",
          lieu: event.lieu || "",
          online_link: event.online_link || "",
          heure: event.heure || "",
          contact_email: event.contact_email || "",
          image: null,
        });
        setImagePreview(event.imageUrl || "/assets/img/about/image.png");
      } catch (error) {
        toast.error("Erreur lors de la récupération de l'événement", { autoClose: 3000 });
      }
    };
    fetchEvent();
  }, [id]);

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
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setServerError(null);

    const token = localStorage.getItem("jwt-token");
    if (!token) {
      toast.error("Vous devez être connecté pour modifier un événement", { autoClose: 3000 });
      setTimeout(() => navigate("/login"), 3000);
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

    try {
      await axios.put(`${BASE_URL}/events/updateEvent/${id}`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success("Événement mis à jour avec succès !", { autoClose: 2000 });
      setTimeout(() => navigate("/events"), 2000);
    } catch (error) {
      console.log("Réponse d'erreur du backend:", error.response?.data);
      if (error.response?.status === 400) {
        const errorsArray = error.response.data.errors;
        if (Array.isArray(errorsArray)) {
          const backendErrors = errorsArray.reduce((acc, err) => {
            const field = err.includes("titre") ? "title" :
                         err.includes("description") ? "description" :
                         err.includes("date de début") ? "start_date" :
                         err.includes("date de fin") ? "end_date" :
                         err.includes("type d'événement") ? "event_type" :
                         err.includes("localisation") ? "localisation" :
                         err.includes("lieu") ? "lieu" :
                         err.includes("lien en ligne") ? "online_link" :
                         err.includes("email") ? "contact_email" : "";
            if (field) acc[field] = err;
            return acc;
          }, {});
          setErrors(backendErrors);
        } else {
          const errorMessage = error.response.data.message || "Erreur de validation";
          setServerError(errorMessage);
          toast.error(errorMessage, { autoClose: 3000 });
        }
      } else {
        const errorMessage = error.response?.data?.message || "Une erreur est survenue lors de la mise à jour de l'événement";
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
          <h2 className="breadcrumb-title">Modifier un Événement</h2>
          <ul className="breadcrumb-menu">
            <li><Link to="/Home">Accueil</Link></li>
            <li><Link to="/events">Événements</Link></li>
            <li className="active">Modifier un Événement</li>
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
                      width: '100%',
                      height: 'auto',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="become-volunteer-form">
                  <h2>Modifier un Événement</h2>
                  <p>Modifiez les détails de l'événement ci-dessous.</p>
                  {serverError && (
                    <p style={{ color: '#dc3545', fontSize: '14px', marginBottom: '15px' }}>
                      {serverError}
                    </p>
                  )}
                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-12" style={{ marginBottom: '15px' }}>
                        <input
                          type="text"
                          name="title"
                          className="form-control"
                          placeholder="Titre de l'événement"
                          value={formData.title}
                          onChange={handleChange}
                          style={{ borderColor: errors.title ? '#dc3545' : '#ced4da' }}
                        />
                        {errors.title && (
                          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                            {errors.title}
                          </p>
                        )}
                      </div>
                      <div className="col-md-12" style={{ marginBottom: '15px' }}>
                        <textarea
                          name="description"
                          className="form-control"
                          cols="30"
                          rows="5"
                          placeholder="Description"
                          value={formData.description}
                          onChange={handleChange}
                          style={{ borderColor: errors.description ? '#dc3545' : '#ced4da' }}
                        />
                        {errors.description && (
                          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                            {errors.description}
                          </p>
                        )}
                      </div>
                      <div className="col-md-6" style={{ marginBottom: '15px' }}>
                        <label htmlFor="start_date" style={{ marginBottom: '5px', display: 'block' }}>
                          Date de début
                        </label>
                        <input
                          type="date"
                          id="start_date"
                          name="start_date"
                          className="form-control"
                          value={formData.start_date}
                          onChange={handleChange}
                          style={{ borderColor: errors.start_date ? '#dc3545' : '#ced4da' }}
                        />
                        {errors.start_date && (
                          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                            {errors.start_date}
                          </p>
                        )}
                      </div>
                      <div className="col-md-6" style={{ marginBottom: '15px' }}>
                        <label htmlFor="end_date" style={{ marginBottom: '5px', display: 'block' }}>
                          Date de fin
                        </label>
                        <input
                          type="date"
                          id="end_date"
                          name="end_date"
                          className="form-control"
                          value={formData.end_date}
                          onChange={handleChange}
                          style={{ borderColor: errors.end_date ? '#dc3545' : '#ced4da' }}
                        />
                        {errors.end_date && (
                          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                            {errors.end_date}
                          </p>
                        )}
                      </div>
                      <div className="col-md-6" style={{ marginBottom: '15px' }}>
                        <label htmlFor="event_type" style={{ marginBottom: '5px', display: 'block' }}>
                          Type d'événement
                        </label>
                        <select
                          id="event_type"
                          name="event_type"
                          className="form-control"
                          value={formData.event_type}
                          onChange={handleChange}
                          style={{
                            borderColor: errors.event_type ? '#dc3545' : '#ced4da',
                            padding: '10px',
                            borderRadius: '5px',
                            fontSize: '16px',
                            color: '#333',
                            outline: 'none',
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <option value="in-person">Présentiel</option>
                          <option value="online">En ligne</option>
                        </select>
                        {errors.event_type && (
                          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                            {errors.event_type}
                          </p>
                        )}
                      </div>
                      <div className="col-md-6" style={{ marginBottom: '15px' }}>
                        <input
                          type="time"
                          name="heure"
                          className="form-control"
                          placeholder="Heure (HH:MM)"
                          value={formData.heure}
                          onChange={handleChange}
                          style={{ borderColor: errors.heure ? '#dc3545' : '#ced4da' }}
                        />
                        {errors.heure && (
                          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                            {errors.heure}
                          </p>
                        )}
                      </div>
                      {formData.event_type === 'in-person' && (
                        <>
                          <div className="col-md-6" style={{ marginBottom: '15px' }}>
                            <select
                              name="localisation"
                              className="form-control"
                              value={formData.localisation}
                              onChange={handleChange}
                              style={{
                                borderColor: errors.localisation ? '#dc3545' : '#ced4da',
                                padding: '10px',
                                borderRadius: '5px',
                                fontSize: '16px',
                                color: '#333',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                              }}
                            >
                              <option value="">Sélectionnez une gouvernorat</option>
                              {tunisianGovernorates.map((governorate) => (
                                <option key={governorate} value={governorate}>
                                  {governorate}
                                </option>
                              ))}
                            </select>
                            {errors.localisation && (
                              <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                                {errors.localisation}
                              </p>
                            )}
                          </div>
                          <div className="col-md-6" style={{ marginBottom: '15px' }}>
                            <input
                              type="text"
                              name="lieu"
                              className="form-control"
                              placeholder="Lieu (ex. salle)"
                              value={formData.lieu}
                              onChange={handleChange}
                              style={{ borderColor: errors.lieu ? '#dc3545' : '#ced4da' }}
                            />
                            {errors.lieu && (
                              <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                                {errors.lieu}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                      {formData.event_type === 'online' && (
                        <div className="col-md-12" style={{ marginBottom: '15px' }}>
                          <input
                            type="url"
                            name="online_link"
                            className="form-control"
                            placeholder="Lien de l'événement en ligne (ex. https://zoom.us/...)"
                            value={formData.online_link}
                            onChange={handleChange}
                            style={{ borderColor: errors.online_link ? '#dc3545' : '#ced4da' }}
                          />
                          {errors.online_link && (
                            <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                              {errors.online_link}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="col-md-12" style={{ marginBottom: '15px' }}>
                        <input
                          type="email"
                          name="contact_email"
                          className="form-control"
                          placeholder="Email de contact"
                          list="emailSuggestions"
                          value={formData.contact_email}
                          onChange={handleChange}
                          style={{ borderColor: errors.contact_email ? '#dc3545' : '#ced4da' }}
                        />
                        <datalist id="emailSuggestions">
                          {emailDomains.map((domain) => (
                            <option key={domain} value={domain} />
                          ))}
                        </datalist>
                        {errors.contact_email && (
                          <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                            {errors.contact_email}
                          </p>
                        )}
                      </div>
                      <div className="col-md-12" style={{ marginBottom: '15px' }}>
                        <label htmlFor="image" style={{ marginBottom: '5px', display: 'block' }}>
                          Image de l'événement
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
                            backgroundColor: '#ff7f5d',
                            color: '#fff',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isSubmitting ? "Mise à jour..." : "Mettre à jour l'événement"}
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

export default EditEvent;