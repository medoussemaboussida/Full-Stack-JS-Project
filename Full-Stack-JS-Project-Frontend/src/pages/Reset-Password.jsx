import React, { useState ,useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";


function Reset_Password() {
    useEffect(() => {
        const navbar = document.querySelector(".header");
        const footer = document.querySelector("footer");
        if (navbar) navbar.style.display = "none";
        if (footer) footer.style.display = "none";
    
        return () => {
          if (navbar) navbar.style.display = "block";
          if (footer) footer.style.display = "block";
        };
      }, [])
    
    const { token } = useParams(); // Récupérer le token depuis l'URL
    const navigate = useNavigate();
    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: "", // Ajouter un état pour le mot de passe de confirmation
    });
    

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Pour afficher/masquer le mot de passe de confirmation

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleMouseDown = (type) => {
        if (type === "newPassword") setShowPassword(true);
        if (type === "confirmPassword") setShowConfirmPassword(true);
    };

    const handleMouseUp = (type) => {
        if (type === "newPassword") setShowPassword(false);
        if (type === "confirmPassword") setShowConfirmPassword(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (passwordData.newPassword.length < 6) {
            setError("The password must be at least 6 characters long.");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        try {
            // Envoyer la requête au backend avec le token et le mot de passe
            const response = await fetch(`http://localhost:5000/users/reset-password/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    password: passwordData.newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Error while resetting the password.");
            }

            setSuccess("Password reset successfully !");
            setError("");

            setTimeout(() => {
                navigate("/login"); // Rediriger après succès
            }, 3000);
        } catch (err) {
            setError(err.message);
            setSuccess("");
        }
    };

    return (
        <div>
            <main className="main">
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Réinitialisation du mot de passe</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Accueil</a></li>
                            <li className="active">Réinitialisation du mot de passe</li>
                        </ul>
                    </div>
                </div>

                <div className="auth-area py-120">
                    <div className="container">
                        <div className="col-md-5 mx-auto">
                            <div className="auth-form">
                                <div className="auth-header">
                                    <img src="assets/img/logo/logo.png" alt="" />
                                    <p>Réinitialisez le mot de passe de votre compte</p>
                                </div>
                                {error && <div className="alert alert-danger">{error}</div>}
                                {success && <div className="alert alert-success">{success}</div>}
                                <form onSubmit={handleSubmit}>
                                    <div className="form-group" style={{ position: "relative" }}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            className="form-control"
                                            placeholder="Nouveau mot de passe"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            style={{ paddingRight: "40px" }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onMouseDown={() => handleMouseDown("newPassword")}
                                            onMouseUp={() => handleMouseUp("newPassword")}
                                            onMouseLeave={() => handleMouseUp("newPassword")}
                                            className="password-toggle"
                                            style={{
                                                position: "absolute",
                                                right: "10px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                fontSize: "18px",
                                                color: "#333",
                                            }}
                                        >
                                            <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                                        </button>
                                    </div>

                                    <div className="form-group" style={{ position: "relative" }}>
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            className="form-control"
                                            placeholder="Confirmer le mot de passe"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            style={{ paddingRight: "40px" }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onMouseDown={() => handleMouseDown("confirmPassword")}
                                            onMouseUp={() => handleMouseUp("confirmPassword")}
                                            onMouseLeave={() => handleMouseUp("confirmPassword")}
                                            className="password-toggle"
                                            style={{
                                                position: "absolute",
                                                right: "10px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                fontSize: "18px",
                                                color: "#333",
                                            }}
                                        >
                                            <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                                        </button>
                                    </div>

                                    <div className="auth-btn">
                                        <button type="submit" className="theme-btn">
                                            <span className="far fa-key"></span> Réinitialiser le mot de passe
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Reset_Password;
