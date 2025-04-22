import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "../App.css";

const BASE_URL = "http://localhost:5000";

const schema = yup.object().shape({
    Name_association: yup
        .string()
        .matches(/^[a-zA-Z0-9\s]+$/, "Name can only contain letters, numbers, and spaces.")
        .min(6, "Name must be at least 6 characters.")
        .max(30, "Name must be at most 30 characters.")
        .required("Name is required."),
    Description_association: yup
        .string()
        .min(10, "Description must be at least 10 characters.")
        .max(1000, "Description must be at most 1000 characters.")
        .required("Description is required."),
    contact_email_association: yup
        .string()
        .email("Invalid email format.")
        .required("Email is required."),
    support_type: yup
        .string()
        .oneOf(["Financial", "Material", "Educational", "Other"], "Invalid support type.")
        .required("Support type is required."),
    logo_association: yup
        .mixed()
        .test("fileSize", "File size is too large", (value) =>
            !value[0] || value[0].size <= 5000000 // 5MB max
        ),
});

const AddAssociation = () => {
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm({ resolver: yupResolver(schema) });

    const [serverError, setServerError] = useState(null);
    const [validationErrors, setValidationErrors] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const navigate = useNavigate();
    const emailInputRef = useRef(null);
    const [emailSuggestions, setEmailSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("jwt-token");
        if (!token) {
            toast.error("You must be logged in to access this page");
            setTimeout(() => navigate("/login"), 2000);
            return;
        }

        const decoded = jwtDecode(token);
        setUserRole(decoded.role);

        if (decoded.role !== "association_member") {
            toast.error("Only association members can add an association");
            setTimeout(() => navigate("/home"), 2000);
        }
    }, [navigate]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };

    const emailDomains = [
        "@gmail.com",
        "@yahoo.com",
        "@hotmail.com",
        "@outlook.com",
        "@icloud.com",
        "@mail.com",
     
    ];

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setValue("contact_email_association", value, { shouldValidate: true });

        if (value.includes("@")) {
            const prefix = value.split("@")[0];
            const suggestions = emailDomains.map((domain) => `${prefix}${domain}`);
            setEmailSuggestions(suggestions);
            setShowSuggestions(true);
        } else {
            setEmailSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setValue("contact_email_association", suggestion, { shouldValidate: true });
        setShowSuggestions(false);
    };

    const handleClickOutside = (e) => {
        if (emailInputRef.current && !emailInputRef.current.contains(e.target)) {
            setShowSuggestions(false);
        }
    };

    useEffect(() => {
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    const onSubmit = async (data) => {
        setServerError(null);
        setValidationErrors([]);

        const token = localStorage.getItem("jwt-token");
        if (!token) {
            toast.error("You must be logged in to add an association");
            return;
        }

        if (userRole !== "association_member") {
            toast.error("Only association members can add an association");
            return;
        }

        if (Object.keys(errors).length > 0) {
            toast.error("Please correct the errors in the form before submitting");
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
            const response = await axios.post(`${BASE_URL}/association/addAssociation`, formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${token}`,
                },
            });
            toast.success("Association added successfully!", { autoClose: 2000 });

            // Store association_id in localStorage
            if (response.data.association_id) {
                localStorage.setItem("association_id", response.data.association_id);
                console.log("Stored association_id:", response.data.association_id);
            }

            reset();
            setImagePreview(null);
            setTimeout(() => navigate("/Associations"), 2000);
        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "An error occurred";
            if (error.response?.status === 400 && error.response.data.errors) {
                setValidationErrors(Object.values(error.response.data.errors).map(err => err.message));
                toast.error("Validation error. Please check the fields.");
            } else if (error.response?.status === 400 && errorMessage.includes("already linked")) {
                toast.error("You already have an association. Association members can only create one association.");
            } else if (error.response?.status === 409 && errorMessage.includes("email")) {
                toast.error("This email is already used by another association.");
            } else if (error.response?.status === 401) {
                toast.error("Session expired. Please log in again.");
                setTimeout(() => navigate("/login"), 2000);
            } else {
                setServerError(errorMessage);
                toast.error(errorMessage);
            }
        }
    };

    return (
        <>
            <div className="site-breadcrumb" style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}>
                <div className="container">
                    <h2 className="breadcrumb-title">Add a New Association</h2>
                    <ul className="breadcrumb-menu">
                        <li><Link to="/Home">Home</Link></li>
                        <li className="active">Add an Association</li>
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
                                    {imagePreview ? (
                                        <img
                                            src={imagePreview}
                                            alt="Association Preview"
                                            className="img-fluid rounded"
                                            style={{ width: "100%", maxHeight: "250px", objectFit: "contain" }}
                                        />
                                    ) : (
                                        <div
                                            style={{
                                                border: "2px dashed #ccc",
                                                backgroundColor: "#f8f9fa",
                                                borderRadius: "8px",
                                                height: "250px",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                textAlign: "center",
                                                padding: "20px",
                                                color: "#6c757d",
                                            }}
                                        >
                                            <i className="fas fa-image fa-3x mb-2"></i>
                                            <p style={{ margin: 0, fontSize: "16px" }}>
                                                Upload Image Here
                                            </p>
                                            <p style={{ margin: 0, fontSize: "12px" }}>
                                                (Click "Upload Association Logo" below)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="col-lg-6">
                                <div className="become-volunteer-form">
                                    <h2>Add an Association</h2>
                                    <p>Fill out the form below to register your association.</p>

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
                                                    placeholder="Association Name"
                                                    {...register("Name_association")}
                                                />
                                                <p className="text-danger">{errors.Name_association?.message}</p>
                                            </div>
                                            <div className="col-md-6 position-relative" ref={emailInputRef}>
                                                <input
                                                    type="email"
                                                    className="form-control"
                                                    placeholder="Email"
                                                    autoComplete="off"
                                                    {...register("contact_email_association")}
                                                    onChange={handleEmailChange}
                                                />
                                                {showSuggestions && emailSuggestions.length > 0 && (
                                                    <ul
                                                        style={{
                                                            position: "absolute",
                                                            zIndex: 1000,
                                                            backgroundColor: "#fff",
                                                            border: "1px solid #ccc",
                                                            borderRadius: "4px",
                                                            maxHeight: "150px",
                                                            overflowY: "auto",
                                                            width: "100%",
                                                            listStyle: "none",
                                                            padding: 0,
                                                            margin: 0,
                                                        }}
                                                    >
                                                        {emailSuggestions.map((suggestion, index) => (
                                                            <li
                                                                key={index}
                                                                style={{
                                                                    padding: "8px",
                                                                    cursor: "pointer",
                                                                }}
                                                                onClick={() => handleSuggestionClick(suggestion)}
                                                                onMouseEnter={(e) => (e.target.style.backgroundColor = "#f0f0f0")}
                                                                onMouseLeave={(e) => (e.target.style.backgroundColor = "#fff")}
                                                            >
                                                                {suggestion}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
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
                                                    <option value="">Select Support Type</option>
                                                    <option value="Financial">Financial</option>
                                                    <option value="Material">Material</option>
                                                    <option value="Educational">Educational</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                                <p className="text-danger">{errors.support_type?.message}</p>
                                            </div>
                                            <div className="col-md-12">
                                                <input
                                                    type="file"
                                                    id="logo-upload"
                                                    className="form-control"
                                                    accept="image/*"
                                                    style={{ display: "none" }}
                                                    {...register("logo_association")}
                                                    onChange={(e) => {
                                                        handleImageChange(e);
                                                        register("logo_association").onChange(e);
                                                    }}
                                                />
                                                <label
                                                    htmlFor="logo-upload"
                                                    className="btn btn-outline-primary w-100 text-left"
                                                    style={{
                                                        padding: "10px",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                    }}
                                                >
                                                    <i className="fas fa-upload"></i>
                                                    {imagePreview ? "Image Selected" : "Upload Association Logo"}
                                                </label>
                                                <p className="text-danger">{errors.logo_association?.message}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            className="theme-btn mt-2"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? "Submitting..." : "Submit Now"} <i className="fas fa-circle-arrow-right"></i>
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