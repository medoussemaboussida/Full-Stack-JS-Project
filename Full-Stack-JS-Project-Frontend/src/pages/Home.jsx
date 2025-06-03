import React, { useState, useEffect, useRef } from "react";
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

        <div className="testimonial-area testimonial-bg pt-80 pb-60">
          <div className="container">
            <div className="row">
              <div className="col-lg-7 mx-auto">
                <div
                  className="site-heading text-center wow fadeInDown"
                  data-wow-delay=".25s"
                >
                  <span className="site-title-tagline">
                    <i className="far fa-hand-heart" /> Welcome
                  </span>
                  <h2 className="site-title text-white">
                    Nurturing Minds, Empowering Futures –{" "}
                    <span>Mental Health</span> for ESPRIT Students
                  </h2>
                  <div className="hero-btn text-center mt-5">
                    {" "}
                    {/* Added text-center and margin-top */}
                    <a
                      href="/About"
                      className="theme-btn me-md-3 mb-3 mb-md-0" // Added margin-bottom for spacing between buttons
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
            </div>
          </div>
        </div>

        {/* Hero area end */}
        {/* skill-area */}
        <div className="skill-area py-100">
          <div className="container">
            <div className="skill-wrap">
              <div className="row g-4 align-items-center">
                <div className="col-lg-6">
                  <div
                    className="skill-img wow fadeInLeft"
                    data-wow-delay=".25s"
                  >
                    <img src="assets/img/hero/01.jpg" alt="thumb" />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div
                    className="skill-content wow fadeInUp"
                    data-wow-delay=".25s"
                  >
             
                    <h2 className="site-title">
                      We Offers You Best <span>Senior Care</span> Services
                    </h2>
                    <p className="skill-text">
                      There are many variations of passages of Lorem Ipsum
                      available, but the majority have suffered alteration in
                      some form, by injected humour, or randomised words which
                      don't look even slightly believable.
                    </p>
                    <div className="skill-progress">
                      <div className="progress-item">
                        <h5>
                          Best Quality Service{" "}
                          <span className="percent">85%</span>
                        </h5>
                        <div className="progress" data-value={85}>
                          <div className="progress-bar" role="progressbar" />
                        </div>
                      </div>
                      <div className="progress-item">
                        <h5>
                          Our Experience <span className="percent">90%</span>
                        </h5>
                        <div className="progress" data-value={90}>
                          <div className="progress-bar" role="progressbar" />
                        </div>
                      </div>
                      <div className="progress-item">
                        <h5>
                          Senior Care <span className="percent">80%</span>
                        </h5>
                        <div className="progress" data-value={80}>
                          <div className="progress-bar" role="progressbar" />
                        </div>
                      </div>
                    </div>
                    <a href="contact.html" className="theme-btn mt-5">
                      Learn More
                      <i className="fas fa-circle-arrow-right" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* skill-area end */}
        {/* Psychiatrist List Section */}
        <div
          className="site-heading text-center wow fadeInDown"
          data-wow-delay=".25s"
        >
          <div className="site-breadcrumb" style={{ background: "url(assets/img/shape/01.png)" ,maxHeight: "250px", overflow: "hidden"}}>
            <div className="container">
              <div className="row">
                <div className="col-lg-7 mx-auto">
                  <div
                    className="site-heading text-center wow fadeInDown"
                    data-wow-delay=".25s"
                  >
                    <span className="site-title-tagline">
                      <i className="far fa-hand-heart" /> Contact
                    </span>
                    <h2 className="site-title text-white">
                      Our <span>Available</span> Psychiatrists
                    </h2>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="container mt-4">
            <PsychiatristList />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
