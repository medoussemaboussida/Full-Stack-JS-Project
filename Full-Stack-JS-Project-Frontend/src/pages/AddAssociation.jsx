
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from 'jwt-decode'; // Ajout pour décoder le token
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import '../App.css';

const BASE_URL = "http://localhost:5000";

const schema = yup.object().shape({
    Name_association: yup.string()
        .matches(/^[a-zA-Z0-9\s]+$/, "Name can only contain letters, numbers, and spaces.")
        .min(6, "Name must be at least 6 characters.")
        .max(30, "Name must be at most 30 characters.")
        .required("Name is required."),
    Description_association: yup.string()
        .min(10, "Description must be at least 10 characters.")
        .max(1000, "Description must be at most 1000 characters.")
        .required("Description is required."),
    contact_email_association: yup.string()
        .email("Invalid email format.")
        .required("Email is required."),
    support_type: yup.string()
        .oneOf(["Financial", "Material", "Educational", "Other"], "Invalid support type.")
        .required("Support type is required."),
    logo_association: yup.mixed().test("fileSize", "File size is too large", (value) => {
        return !value[0] || (value[0].size <= 5000000); // 5MB max
    })
});

const AddAssociation = () => {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({ resolver: yupResolver(schema) });

    const [serverError, setServerError] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const navigate = useNavigate();

    // Vérifier le rôle de l'utilisateur au chargement
    useEffect(() => {
        const token = localStorage.getItem('jwt-token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUserRole(decoded.role); // Supposons que le rôle soit inclus dans le token
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
            toast.error("Vous devez être connecté pour ajouter une association");
            return;
        }

        if (userRole !== 'association_member') {
            toast.error("Seuls les membres associatifs peuvent ajouter une association");
            return;
        }

        const formData = new FormData();
        formData.append("Name_association", data.Name_association);
        formData.append("Description_association", data.Description_association);
        formData.append("contact_email_association", data.contact_email_association);
        formData.append("support_type", data.support_type);
        if (data.logo_association.length > 0) {
            formData.append("logo_association", data.logo_association[0]);
        }

        try {
            await axios.post(`${BASE_URL}/association/addAssociation`, formData, {
                headers: { 
                    "Content-Type": "multipart/form-data",
                    "Authorization": `Bearer ${token}`,
                }
            });
            toast.success("Association ajoutée avec succès !", { autoClose: 2000 });
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
                    <h2 className="breadcrumb-title">Ajouter une Nouvelle Association</h2>
                    <ul className="breadcrumb-menu">
                        <li><Link to="/Home">Accueil</Link></li>
                        <li className="active">Ajouter une Association</li>
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
                                    <img src="/assets/img/volunteer/01.jpg" alt="Volunteer" className="img-fluid rounded" />
                                </div>
                            </div>
                            <div className="col-lg-6">
                                <div className="become-volunteer-form">
                                    <h2>Ajouter une Association</h2>
                                    <p>Remplissez le formulaire ci-dessous pour enregistrer votre association.</p>
                                    {serverError && <p className="text-danger">{serverError}</p>}
                                    <form onSubmit={handleSubmit(onSubmit)}>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <input type="text" className="form-control" placeholder="Nom de l'association" {...register("Name_association")} />
                                                <p className="text-danger">{errors.Name_association?.message}</p>
                                            </div>
                                            <div className="col-md-6">
                                                <input type="email" className="form-control" placeholder="Email" {...register("contact_email_association")} />
                                                <p className="text-danger">{errors.contact_email_association?.message}</p>
                                            </div>
                                            <div className="col-md-12">
                                                <textarea className="form-control" cols="30" rows="5" placeholder="Description" {...register("Description_association")} />
                                                <p className="text-danger">{errors.Description_association?.message}</p>
                                            </div>
                                            <div className="col-md-12">
                                                <select className="form-control" {...register("support_type")}>
                                                    <option value="">Sélectionnez un type de soutien</option>
                                                    <option value="Financial">Financier</option>
                                                    <option value="Material">Matériel</option>
                                                    <option value="Educational">Éducatif</option>
                                                    <option value="Other">Autre</option>
                                                </select>
                                                <p className="text-danger">{errors.support_type?.message}</p>
                                            </div>
                                            <div className="col-md-12">
                                                <input type="file" className="form-control" accept="image/*" {...register("logo_association")} />
                                                <p className="text-danger">{errors.logo_association?.message}</p>
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

export default AddAssociation;