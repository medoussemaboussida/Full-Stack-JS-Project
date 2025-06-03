import React, { useState, useEffect,useRef } from "react";
import { jwtDecode } from "jwt-decode";
import PsychiatristList from "./PsychiatristList ";

const useAuth = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          console.log("Token expiré. Redirection vers /login");
          localStorage.removeItem("jwt-token");
          window.location.href = "/login";
          return;
        }

        const fetchUser = async () => {
          try {
            const response = await fetch(
              `http://localhost:5000/users/session/${decoded.id}`
            );
            const data = await response.json();
            if (response.ok) {
              setUser(data);
            } else {
              console.log("Session invalide, redirection...");
              localStorage.removeItem("jwt-token");
              window.location.href = "/login";
            }
          } catch (error) {
            console.log(
              "Erreur lors de la récupération de l’utilisateur:",
              error
            );
            window.location.href = "/login";
          }
        };

        fetchUser();
      } catch (error) {
        console.log("Token invalide:", error);
        localStorage.removeItem("jwt-token");
        window.location.href = "/login";
      }
    } else {
      window.location.href = "/login";
    }
  }, []);

  return user;
};

function Home() {
  const user = useAuth();
  const heroRef = useRef(null);
  const [animateHero, setAnimateHero] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setAnimateHero(entry.isIntersecting); // true = visible
      },
      { threshold: 0.3 } // Déclenche quand 30% de l'élément est visible
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);

  return (
    <div>
          <style>
        {`
          // .fade-in-up {
          //   opacity: 0;
          //   transform: translateY(20px);
          //   animation: fadeInUp 1s ease-out forwards;
          // }

          @keyframes fadeInUp {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      {/* Navbar avec bouton de déconnexion à droite, au même niveau que navbar-toggler */}
      {/* <nav className="navbar navbar-expand-lg navbar-light bg-light"> */}
        <div className="container-fluid d-flex justify-content-between align-items-center">
          {/* <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button> */}
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              {/* Bouton de déconnexion à droite */}
              {user && <li className="nav-item"></li>}
            </ul>
          </div>
        </div>
      {/* </nav> */}
      <main className="main">
        {/* Hero area */}
         <div className="hero-section">
            
        <div
            ref={heroRef}
            className={`hero-single ${animateHero ? "fade-in-up" : ""}`}
            style={{ backgroundImage: "url(assets/img/shape/02.png)" }}
          >
            <div className="container">
              <div className="row align-items-center">
                <div className="col-md-12 col-lg-9">
                  <div className="hero-content">
                    <h1 className="hero-title">
                      Nurturing Minds, Empowering Futures – Mental Health Care
                      for ESPRIT Students
                    </h1>
                    <p>
                      EspritCare offers the
                      support and tools to help students thrive both
                      academically and emotionally.
                    </p>
                    <div
                      className="hero-btn"
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        padding: "10px",
                        alignItems: "center",
                      }}
                    >
                      <a
                        href="/About"
                        className="theme-btn"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0 20px",
                          backgroundColor: "#007bff",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "50px",
                          height: "50px",
                          width: "250px",
                          fontSize: "16px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        Discover Our Services
                        <i
                          className="fas fa-circle-arrow-right"
                          style={{ marginLeft: "10px" }}
                        ></i>
                      </a>
                      <a
                        href="contact.html"
                        className="theme-btn"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0 20px",
                          backgroundColor: "#ff69b4",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: "50px",
                          height: "50px",
                          width: "250px",
                          fontSize: "16px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                          transition: "all 0.3s ease",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        Reach Out for Support
                        <i
                          className="fas fa-circle-arrow-right"
                          style={{ marginLeft: "10px" }}
                        ></i>
                      </a>
                    </div>
                  </div>
                </div>
                {/* Optionnel : image */}
              </div>
            </div>
          </div>
        </div>

        {/* Hero area end */}

        {/* Psychiatrist List Section */}
        <div className="container mt-4">
          <PsychiatristList />
        </div>
      </main>
    </div>
  );
}

export default Home;
