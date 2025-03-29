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
    const [validationErrors, setValidationErrors] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
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

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    const onSubmit = async (data) => {
        setServerError(null);
        setValidationErrors([]);

        const token = localStorage.getItem('jwt-token');
        if (!token) {
            toast.error("Vous devez être connecté pour ajouter une association");
            return;
        }

        if (userRole !== 'association_member') {
            toast.error("Seuls les membres associatifs peuvent ajouter une association");
            return;
        }

        if (Object.keys(errors).length > 0) {
            toast.error("Veuillez corriger les erreurs dans le formulaire avant de soumettre");
            return;
        }

        const formData = new FormData();
        formData.append("Name_association", data.Name_association);
        formData.append("Description_association", data.Description_association);
        formData.append("contact_email_association", data.contact_email_association);
        formData.append("support_type", data.support_type);
        if (data.logo_association && data.logo_association.length > 0) {
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
            setImagePreview(null);
            setTimeout(() => navigate('/Associations'), 2000);
        } catch (error) {
            if (error.response && error.response.status === 400 && error.response.data.errors) {
                setValidationErrors(error.response.data.errors);
                toast.error("Erreur de validation. Veuillez vérifier les champs.");
            } else {
                const errorMessage = error.response?.data?.message || "Une erreur est survenue";
                setServerError(errorMessage);
                toast.error(errorMessage);
            }
        }
    };

    // List of common email domains for suggestions
    const emailDomains = [
        "@gmail.com",
        "@yahoo.com",
        "@hotmail.com",
        "@outlook.com",
        "@aol.com",
        "@icloud.com",
        "@mail.com",
        "@protonmail.com",
        "@gmx.com",
        "@zoho.com",
    ];

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
                                    <img
                                        src={imagePreview || "/assets/img/volunteer/01.jpg"}
                                        alt="Association Preview"
                                        className="img-fluid rounded"
                                    />
                                </div>
                            </div>
                            <div className="col-lg-6">
                                <div className="become-volunteer-form">
                                    <h2>Ajouter une Association</h2>
                                    <p>Remplissez le formulaire ci-dessous pour enregistrer votre association.</p>

                                    {serverError && (
                                        <div className="alert alert-danger" role="alert">
                                            {serverError}
                                        </div>
                                    )}

                                    {validationErrors.length > 0 && (
                                        <div className="alert alert-danger" role="alert">
                                            <ul>
                                                {validationErrors.map((error, index) => (
                                                    <li key={index}>{error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit(onSubmit)}>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Nom de l'association"
                                                    {...register("Name_association")}
                                                />
                                                <p className="text-danger">{errors.Name_association?.message}</p>
                                            </div>
                                            <div className="col-md-6 position-relative">
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    placeholder="Email"
                                                    list="emailDomains" // Link to the datalist
                                                    {...register("contact_email_association")}
                                                />
                                                {/* Datalist for email domain suggestions */}
                                                <datalist id="emailDomains">
                                                    {emailDomains.map((domain, index) => (
                                                        <option key={index} value={domain} />
                                                    ))}
                                                </datalist>
                                                <p className="text-danger">{errors.contact_email_association?.message}</p>
                                            </div>
                                            <div className="col-md-12">
                                                <textarea
                                                    className="form-control"
                                                    cols="30"
                                                    rows="5"
                                                    placeholder="Description"
                                                    {...register("Description_association")}
                                                />
                                                <p className="text-danger">{errors.Description_association?.message}</p>
                                            </div>
                                            <div className="col-md-12">
                                                <select
                                                    className="form-control"
                                                    {...register("support_type")}
                                                >
                                                    <option value="">Sélectionnez un type de soutien</option>
                                                    <option value="Financial">Financier</option>
                                                    <option value="Material">Matériel</option>
                                                    <option value="Educational">Éducatif</option>
                                                    <option value="Other">Autre</option>
                                                </select>
                                                <p className="text-danger">{errors.support_type?.message}</p>
                                            </div>
                                            <div className="col-md-12">
                                                <input
                                                    type="file"
                                                    className="form-control"
                                                    accept="image/*"
                                                    {...register("logo_association")}
                                                    onChange={(e) => {
                                                        handleImageChange(e);
                                                        register("logo_association").onChange(e);
                                                    }}
                                                />
                                                <p className="text-danger">{errors.logo_association?.message}</p>
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

export default AddAssociation;