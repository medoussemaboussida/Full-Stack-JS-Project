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
  title: yup.string()
    .min(6, "Le titre doit contenir au moins 6 caractères")
    .max(100, "Le titre doit contenir au plus 100 caractères")
    .required("Le titre est requis"),
  description: yup.string()
    .min(10, "La description doit contenir au moins 10 caractères")
    .max(1000, "La description doit contenir au plus 1000 caractères")
    .required("La description est requise"),
  date: yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "La date doit être au format YYYY-MM-DD")
    .required("La date est requise")
    .test('is-future', "La date doit être dans le futur", value => new Date(value) > new Date()),
  localisation: yup.string()
    .min(3, "La localisation doit contenir au moins 3 caractères")
    .max(200, "La localisation doit contenir au plus 200 caractères")
    .required("La localisation est requise"),
  lieu: yup.string()
    .min(3, "Le lieu doit contenir au moins 3 caractères")
    .max(200, "Le lieu doit contenir au plus 200 caractères")
    .required("Le lieu est requis"),
  heure: yup.string()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "L'heure doit être au format HH:MM")
    .required("L'heure est requise"),
  contact_email: yup.string()
    .email("Format d'email invalide")
    .required("L'email est requis"),
  image: yup.mixed()
    .test('fileSize', 'Le fichier est trop volumineux (max 5MB)', value => !value || !value[0] || value[0].size <= 5 * 1024 * 1024)
    .test('fileType', 'Seules les images JPEG, JPG, PNG ou GIF sont autorisées', value => !value || !value[0] || /image\/(jpeg|jpg|png|gif)$/.test(value[0].type))
});

const AddEvent = () => {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      date: "",
      heure: "",
    },
  });
  const [serverError, setServerError] = useState(null);
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

    // Créer un objet FormData pour inclure les fichiers
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('date', data.date);
    formData.append('localisation', data.localisation);
    formData.append('lieu', data.lieu);
    formData.append('heure', data.heure);
    formData.append('contact_email', data.contact_email);
    if (data.image && data.image[0]) {
      formData.append('image', data.image[0]); // Ajouter l'image si présente
    }

    console.log('Données envoyées au backend:', Object.fromEntries(formData));

    try {
      const response = await axios.post(`${BASE_URL}/events/addEvent`, formData, {
        headers: {
          "Authorization": `Bearer ${token}`,
          // Pas besoin de définir "Content-Type" manuellement avec FormData, axios le fait automatiquement
        },
      });
      toast.success("Événement ajouté avec succès !", { autoClose: 2000 });
      reset();
      setTimeout(() => navigate('/events'), 2000);
    } catch (error) {
      setServerError(error.response?.data?.message || "Une erreur est survenue lors de l'ajout de l'événement");
      console.error('Erreur de la requête:', error.response?.data);
      toast.error(serverError);
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
                  <img src="/assets/img/about/image.png" alt="Event" className="img-fluid rounded" />
                </div>
              </div>
              <div className="col-lg-6">
                <div className="become-volunteer-form">
                  <h2>Ajouter un Événement</h2>
                  <p>Remplissez le formulaire ci-dessous pour créer un nouvel événement.</p>
                  {serverError && <p className="text-danger">{serverError}</p>}
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="row">
                      <div className="col-md-12">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Titre de l'événement"
                          {...register("title")}
                        />
                        <p className="text-danger">{errors.title?.message}</p>
                      </div>
                      <div className="col-md-12">
                        <textarea
                          className="form-control"
                          cols="30"
                          rows="5"
                          placeholder="Description"
                          {...register("description")}
                        />
                        <p className="text-danger">{errors.description?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <input
                          type="date"
                          className="form-control"
                          {...register("date")}
                        />
                        <p className="text-danger">{errors.date?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <input
                          type="time"
                          className="form-control"
                          placeholder="Heure (HH:MM)"
                          {...register("heure")}
                        />
                        <p className="text-danger">{errors.heure?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Localisation (ex. ville)"
                          {...register("localisation")}
                        />
                        <p className="text-danger">{errors.localisation?.message}</p>
                      </div>
                      <div className="col-md-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Lieu (ex. salle)"
                          {...register("lieu")}
                        />
                        <p className="text-danger">{errors.lieu?.message}</p>
                      </div>
                      <div className="col-md-12">
                        <input
                          type="email"
                          className="form-control"
                          placeholder="Email de contact"
                          {...register("contact_email")}
                        />
                        <p className="text-danger">{errors.contact_email?.message}</p>
                      </div>
                      <div className="col-md-12">
                        <input
                          type="file"
                          className="form-control"
                          accept="image/jpeg,image/jpg,image/png,image/gif"
                          {...register("image")}
                        />
                        <p className="text-danger">{errors.image?.message}</p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="theme-btn mt-2"
                      disabled={isSubmitting}
                    >
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