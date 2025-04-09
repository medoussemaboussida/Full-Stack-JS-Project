import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as yup from 'yup'; // Importer yup
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from 'react-toastify';

function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        dob: '',
        level: '',
        speciality: '',
    });

    const [errors, setErrors] = useState({}); // Pour stocker les erreurs de validation
    const [showPassword, setShowPassword] = useState(false);

    const { username, dob, email, password, speciality, level } = formData;

    const analyzePassword = (password) => {
        const messages = [];
    
        // Vérifier la longueur du mot de passe
        if (password.length < 8) {
            messages.push("Password must be at least 8 characters long.");
        }
    
        // Vérifier la présence de majuscules
        if (!/[A-Z]/.test(password)) {
            messages.push("Password must contain at least one uppercase letter.");
        }
    
        // Vérifier la présence de minuscules
        if (!/[a-z]/.test(password)) {
            messages.push("Password must contain at least one lowercase letter.");
        }
    
        // Vérifier la présence de chiffres
        if (!/\d/.test(password)) {
            messages.push("Password must contain at least one number.");
        }
    
        // Vérifier la présence de caractères spéciaux
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            messages.push("Password must contain at least one special character.");
        }
    
        return messages;
    };

    const getPasswordStrength = (password) => {
        // Simuler l'analyse de sentiment (simplifié pour le frontend)
        const sentimentScore = 1; // Par défaut, neutre
    
        // Score basé sur la longueur du mot de passe
        const lengthScore = password.length >= 12 ? 4 : password.length >= 8 ? 3 : 1;
    
        // Score basé sur la complexité du mot de passe
        let complexityScore = 0;
        if (/[A-Z]/.test(password)) complexityScore += 2; // Majuscules
        if (/[a-z]/.test(password)) complexityScore += 2; // Minuscules
        if (/\d/.test(password)) complexityScore += 2; // Chiffres
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) complexityScore += 2; // Caractères spéciaux
    
        // Score total
        const totalScore = sentimentScore + lengthScore + complexityScore;
    
        if (totalScore >= 12) return "STRONG";
        if (totalScore >= 8) return "MODERATE";
        return "WEAK";
    };

    // Schéma de validation avec yup
    const validationSchema = yup.object().shape({
        username: yup.string()
            .matches(/^[A-Z][a-zA-Z\s]*$/, "Username must start with an uppercase letter and contain only letters.")
            .min(6, "Username must be at least 6 characters long.")
            .required("Username is required."),

        email: yup.string()
            .email("Invalid email format.")
            .matches(/^[a-zA-Z0-9._%+-]+@esprit\.tn$/, "Email must end with @esprit.tn.")
            .required("Email is required."),

        dob: yup.date()
            .nullable() // Permet de gérer les valeurs null
            .transform((value, originalValue) => originalValue === "" ? null : value) // Convertit "" en null
            .max(new Date(), "Date of birth cannot be in the future.")
            .test("is-18", "Minimum age is 18.", function (value) {
                if (!value) return false;
                const today = new Date();
                const birthDate = new Date(value);
                const age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                const dayDiff = today.getDate() - birthDate.getDate();
                
                if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                    return age - 1 >= 18;
                }
                return age >= 18;
            })
            .required("Date of birth is required."),

        password: yup.string()
            .test("password-strength", "Password is too weak.", function(value) {
                const messages = analyzePassword(value);
                if (messages.length > 0) {
                    return this.createError({ message: messages.join(" ") });
                }
                return true;
            })
            .required("Password is required."),

        speciality: yup.string()
            .oneOf(["A", "B", "TWIN", "SAE", "SE", "BI", "DS", "IOSYS", "SLEAM", "SIM", "NIDS", "INFINI"], "Invalid speciality.")
            .required("Speciality is required."),

        level: yup.number()
            .nullable()  // Permet de gérer null ou vide
            .transform((originalValue) => (originalValue === "" ? null : originalValue))  // Transforme "" en null
            .typeError("Level is required.")  // Message d'erreur si ce n'est pas un nombre
            .min(1, "Level must be at least 1.")  // Niveau minimum
            .max(5, "Level must be at most 5.")  // Niveau maximum
            .required("Level is required."),  // Validation si vide
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        // Effacer l'erreur correspondante lorsqu'un champ est modifié
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Valider les données du formulaire avec yup
            await validationSchema.validate(formData, { abortEarly: false });

            // Si la validation réussit, envoyer les données au serveur
            const response = await fetch('http://localhost:5000/users/addStudent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();
            if (response.ok) {
                toast.success('Student registered successfully!');
                window.location.href = '/login'; // Rediriger vers la page de connexion
            } else {
                toast.error('Failed to register student');
            }
        } catch (err) {
            // Gestion des erreurs de validation
            if (err.name === 'ValidationError') {
                const validationErrors = {};
                err.inner.forEach((error) => {
                    validationErrors[error.path] = error.message;
                });
                setErrors(validationErrors);
                toast.error('Respect the form please !');
            } else {
                console.error(err);
                toast.error('An error occurred while registering the student.');
            }
        }
    };

    useEffect(() => {
        const navbar = document.querySelector(".header");
        const footer = document.querySelector("footer");
        if (navbar) navbar.style.display = "none";
        if (footer) footer.style.display = "none";

        return () => {
            if (navbar) navbar.style.display = "block";
            if (footer) footer.style.display = "block";
        };
    }, []);

    // Calculer la force du mot de passe et les propriétés de la barre de progression
    const passwordStrength = getPasswordStrength(password);
    const progressWidth = passwordStrength === "WEAK" ? "33%" : passwordStrength === "MODERATE" ? "66%" : "100%";
    const progressColor = passwordStrength === "WEAK" ? "#ff4d4f" : passwordStrength === "MODERATE" ? "#ffa500" : "#28a745";

    return (
        <div>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <main className="main">
                <div className="auth-area py-120">
                    <div className="container">
                        <div className="col-md-5 mx-auto">
                            <div className="auth-form">
                                <div className="auth-header">
                                    <img src="assets/img/logo/logo.png" alt="" />
                                </div>
                                <form onSubmit={handleSubmit}>
                                    {/* Username */}
                                    <div className="form-group">
                                        <div className="form-icon">
                                            <i className="far fa-user-tie"></i>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                name="username" 
                                                placeholder="Your Name" 
                                                value={username} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                        {errors.username && <p className="text-danger">{errors.username}</p>}
                                    </div>

                                    {/* Email */}
                                    <div className="form-group">
                                        <div className="form-icon">
                                            <i className="far fa-envelope"></i>
                                            <input 
                                                type="email" 
                                                className="form-control" 
                                                name="email" 
                                                placeholder="Your Email" 
                                                value={email} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                        {errors.email && <p className="text-danger">{errors.email}</p>}
                                    </div>

                                    {/* Password */}
                                    <div className="form-group">
                                        <div className="form-icon">
                                            <i className="far fa-key"></i>
                                            <input 
                                                type={showPassword ? "text" : "password"} 
                                                id="password" 
                                                className="form-control" 
                                                name="password" 
                                                placeholder="Your Password" 
                                                value={password} 
                                                onChange={handleChange} 
                                            />
                                            <span className="password-view" onClick={togglePasswordVisibility}>
                                                <i className={`far ${showPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
                                            </span>
                                        </div>
                                        {/* Barre de progression pour la force du mot de passe */}
                                        {password && (
                                            <div className="password-strength mt-2">
                                                <div
                                                    style={{
                                                        height: '5px',
                                                        width: '100%',
                                                        backgroundColor: '#e0e0e0',
                                                        borderRadius: '5px',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            height: '100%',
                                                            width: progressWidth,
                                                            backgroundColor: progressColor,
                                                            transition: 'width 0.3s ease-in-out',
                                                        }}
                                                    />
                                                </div>
                                                <p
                                                    style={{
                                                        color: progressColor,
                                                        fontSize: '0.875rem',
                                                        marginTop: '5px',
                                                    }}
                                                >
                                                    Password Strength: {passwordStrength}
                                                </p>
                                            </div>
                                        )}
                                        {errors.password && <p className="text-danger">{errors.password}</p>}
                                    </div>

                                    {/* Date of Birth */}
                                    <div className="form-group">
                                        <div className="form-icon">
                                            <i className="far fa-calendar-alt"></i>
                                            <input 
                                                type="date" 
                                                className="form-control"
                                                name="dob" 
                                                value={dob} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                        {errors.dob && <p className="text-danger">{errors.dob}</p>}
                                    </div>

                                    {/* Level */}
                                    <div className="form-group">
                                        <div className="form-icon">
                                            <i className="far fa-graduation-cap"></i>
                                            <select 
                                                className="form-control" 
                                                name="level" 
                                                value={level} 
                                                onChange={handleChange}
                                            >
                                                <option value="">Select Level</option>
                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                                <option value="3">3</option>
                                                <option value="4">4</option>
                                                <option value="5">5</option>
                                            </select>
                                        </div>
                                        {errors.level && <p className="text-danger">{errors.level}</p>}
                                    </div>

                                    {/* Speciality */}
                                    <div className="form-group">
                                        <div className="form-icon">
                                            <i className="far fa-cogs"></i>
                                            <select 
                                                className="form-control" 
                                                name="speciality" 
                                                value={speciality} 
                                                onChange={handleChange}
                                            >
                                                <option value="">Select Speciality</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="P">P</option>
                                                <option value="TWIN">TWIN</option>
                                                <option value="SAE">SAE</option>
                                                <option value="SE">SE</option>
                                                <option value="BI">BI</option>
                                                <option value="DS">DS</option>
                                                <option value="IOSYS">IOSYS</option>
                                                <option value="SLEAM">SLEAM</option>
                                                <option value="SIM">SIM</option>
                                                <option value="NIDS">NIDS</option>
                                                <option value="INFINI">INFINI</option>
                                            </select>
                                        </div>
                                        {errors.speciality && <p className="text-danger">{errors.speciality}</p>}
                                    </div>

                                    <div className="auth-btn">
                                        <button type="submit" className="theme-btn">
                                            <span className="far fa-paper-plane"></span> Register
                                        </button>
                                    </div>
                                </form>
                                <div className="auth-bottom">
                                    <div className="auth-social">
                                        <p>Continue with social media</p>
                                        <div className="auth-social-list">
                                            <a href="#"><i className="fab fa-facebook-f"></i></a>
                                            <a href="http://localhost:5000/auth/google">
                                                <i className="fab fa-google"></i>
                                            </a>
                                            <a href="http://localhost:5000/auth/github">
                                                <i className="fab fa-github"></i>
                                            </a>
                                        </div>
                                    </div>
                                    <p className="auth-bottom-text">
                                        Already have an account <Link to="/login">Log in</Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Register;