import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import '../App.css';

const BASE_URL = "http://localhost:5000";

const schema = yup.object().shape({
  Name_event: yup.string().min(6, "Le nom doit contenir au moins 6 caractères").max(50, "Le nom doit contenir au plus 50 caractères").required("Le nom est requis"),
  Description_event: yup.string().min(10, "La description doit contenir au moins 10 caractères").max(1000, "La description doit contenir au plus 1000 caractères").required("La description est requise"),
  contact_email_event: yup.string().email("Format d'email invalide").required("L'email est requis"),
  support_type_event: yup.string()
    .oneOf([
      'PsychologicalCounseling', 
      'SupportGroup', 
      'TherapeuticWorkshop', 
      'AwarenessCampaign', 
      'PeerSupport', 
      'CrisisIntervention', 
      'WellnessActivity'
    ], "Type de soutien invalide")
    .required("Le type de soutien est requis"),
  Localisation_event: yup.string().required("Le lieu est requis"),
  Date_event: yup.date().min(new Date(), "La date doit être dans le futur").required("La date est requise"),
  Time_event: yup.string().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "L'heure doit être au format HH:MM").required("L'heure est requise"),
  associations: yup.array().of(yup.string()),
});

const AddEvent = () => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: yupResolver(schema) });
  const [serverError, setServerError] = useState(null);
  const [associations, setAssociations] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt-token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserRole(decoded.role);
      } catch (error) {
        console.error('Invalid token:', error);
        toast.error("Token invalide, veuillez vous reconnecter");
      }
    }

    const fetchAssociations = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/association/getAssociations`);
        setAssociations(response.data);
      } catch (err) {
        toast.error("Erreur lors de la récupération des associations");
      }
    };
    fetchAssociations();
  }, []);

  const onSubmit = async (data) => {
    setServerError(null);
    const token = localStorage.getItem('jwt-token');
    if (!token) {
      toast.error("Vous devez être connecté pour ajouter un événement");
      return;
    }
    if (userRole !== 'association_member') {
      toast.error("Seuls les membres associatifs peuvent ajouter un événement");
      return;
    }

    try {
      await axios.post(`${BASE_URL}/event/addEvent`, data, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      toast.success("Événement ajouté avec succès !", { autoClose: 2000 });
      reset();
      setTimeout(() => navigate('/Associations'), 2000);
    } catch (error) {
      setServerError(error.response?.data?.message || "Une erreur est survenue");
    }
  };

  return (
    <>
      <div className="site-breadcrumb" style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Ajouter un Nouvel Événement</h2>
          <ul className="breadcrumb-menu">
            <li><Link to="/Home">Accueil</Link></li>
            <li className="active">Ajouter un Événement</li>
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
                  <img src="/assets/img/volunteer/01.jpg" alt="Event" className="img-fluid rounded" />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="become-volunteer-form">
                  <h2>Ajouter un Événement</h2>
                  <p>Remplissez le formulaire ci-dessous pour créer un nouvel événement.</p>
                  {serverError && <p className="text-danger">{serverError}</p>}
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="row">
                      <div className="col-md-6">
                        <input type="text" className="form-control" placeholder="Nom de l'événement" {...register("Name_event")} />
                        <p className="text-danger">{errors.Name_event?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <input type="email" className="form-control" placeholder="Email de contact" {...register("contact_email_event")} />
                        <p className="text-danger">{errors.contact_email_event?.message}</p>
                      </div>
                      <div className="col-md-12">
                        <textarea className="form-control" cols="30" rows="5" placeholder="Description" {...register("Description_event")} />
                        <p className="text-danger">{errors.Description_event?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <select className="form-control" {...register("support_type_event")}>
                          <option value="">Type de soutien</option>
                          <option value="PsychologicalCounseling">Conseil Psychologique</option>
                          <option value="SupportGroup">Groupe de Soutien</option>
                          <option value="TherapeuticWorkshop">Atelier Thérapeutique</option>
                          <option value="AwarenessCampaign">Campagne de Sensibilisation</option>
                          <option value="PeerSupport">Soutien par les Pairs</option>
                          <option value="CrisisIntervention">Intervention en Crise</option>
                          <option value="WellnessActivity">Activité de Bien-être</option>
                        </select>
                        <p className="text-danger">{errors.support_type_event?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <input type="text" className="form-control" placeholder="Lieu" {...register("Localisation_event")} />
                        <p className="text-danger">{errors.Localisation_event?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <input type="date" className="form-control" {...register("Date_event")} />
                        <p className="text-danger">{errors.Date_event?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <input type="time" className="form-control" {...register("Time_event")} />
                        <p className="text-danger">{errors.Time_event?.message}</p>
                      </div>
                      <div className="col-md-12">
                        <select multiple className="form-control" {...register("associations")}>
                          {associations.map((assoc) => (
                            <option key={assoc._id} value={assoc._id}>{assoc.Name_association}</option>
                          ))}
                        </select>
                        <p className="text-muted">Maintenez Ctrl/Cmd pour sélectionner plusieurs associations</p>
                      </div>
                    </div>
                    <button type="submit" className="theme-btn mt-2" disabled={isSubmitting}>
                      {isSubmitting ? "Envoi en cours..." : "Soumettre maintenant"} <i className="fas fa-circle-arrow-right"></i>
                    </button>
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