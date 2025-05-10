import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha"; // Ensure you import the ReCAPTCHA component

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState(null); // State to hold reCAPTCHA token
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false); // Ajout de l'état pour gérer la visibilité du mot de passe
  const [rememberMe, setRememberMe] = useState(false);
  // Charger l'email et le mot de passe enregistrés
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

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

  const onRecaptchaChange = (token) => {
    setRecaptchaToken(token); // Set the reCAPTCHA token when the user passes the check
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!recaptchaToken) {
      setError("Veuillez compléter le reCAPTCHA.");
      return; // Bloquer la connexion si reCAPTCHA non validé
    }

    try {
      const response = await fetch("http://localhost:5000/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }), // Envoie uniquement email et password
      });

      const data = await response.json();

      if (response.ok) {
        const token = data.token;
        localStorage.setItem("jwt-token", token);
        // Stocker les identifiants si "Remember Me" est coché
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", email);
          localStorage.setItem("rememberedPassword", password);
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
        }
        // Vérifier l'état du compte
        if (data.user.etat === "Désactivé") {
          navigate("/accountdisabled"); // Redirection si le compte est désactivé
        } else {
          const allowedRoles = [
            "student",
            "psychiatrist",
            "teacher",
            "association_member",
          ];
          if (allowedRoles.includes(data.user.role)) {
            navigate("/Home");
          } else {
            window.location.href = `http://localhost:5001/?token=${token}`;
          }
        }
      } else {
        setError(
          data.message ||
            "Échec de connexion. Veuillez vérifier vos identifiants."
        );
      }
    } catch (err) {
      setError("Une erreur est survenue lors de la connexion.");
      console.error(err);
    }
  };

  return (
    <div>
      <main className="main">
        <div className="auth-area py-120">
          <div className="container">
            <div className="col-md-5 mx-auto">
              <div className="auth-form">
                <div className="auth-header">
                  <img src="assets/img/logo/logo.png" alt="" />
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <div className="form-icon">
                      <i className="far fa-envelope"></i>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="Your Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ borderRadius: "50px" }}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="form-icon">
                      <i className="far fa-key"></i>
                      <input
                        type={showPassword ? "text" : "password"} // Gère la visibilité
                        id="password"
                        className="form-control"
                        placeholder="Your Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ borderRadius: "50px" }}
                      />
                    </div>
                  </div>
                  <div className="auth-group">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        id="remember"
                      />
                      <label className="form-check-label" htmlFor="remember">
                        Remember Me
                      </label>
                    </div>
                    <a href="forgot-password" className="auth-group-link">
                      Forgot Password?
                    </a>
                  </div>
                  {error && <p className="text-danger">{error}</p>}

                  <ReCAPTCHA
                    sitekey="6LdClt4qAAAAAKi0ZNeubhh769yQXit1T4Zf29gG"
                    onChange={onRecaptchaChange}
                  />
                  <br/>
                  <div className="auth-btn">
                    <button type="submit" className="theme-btn" style={{ borderRadius: "50px", height:"50px",fontSize: "16px" }}>
                      <span className="far fa-sign-in" ></span> Login
                    </button>
                  </div>
                </form>
                <div className="auth-bottom">
                  <div className="auth-social">
                    <p>Continue with social media</p>
                    <div className="auth-social-list">
                      <a href="#">
                        <i className="fab fa-facebook-f"></i>
                      </a>
                      <a href="http://localhost:5000/auth/google">
                        <i className="fab fa-google"></i>
                      </a>
                      <a href="http://localhost:5000/auth/github">
                        <i className="fab fa-github"></i>
                      </a>
                    </div>
                  </div>
                  <p className="auth-bottom-text">
                    Don't have an account? <Link to="/register">Register</Link>
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

export default Login;
