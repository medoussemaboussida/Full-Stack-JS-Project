import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; 
import PsychiatristList from './PsychiatristList ';



const useAuth = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('jwt-token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000; 

                if (decoded.exp < currentTime) {
                    console.log('Token expiré. Redirection vers /login');
                    localStorage.removeItem('jwt-token');
                    window.location.href = '/login';
                    return;
                }

                const fetchUser = async () => {
                    try {
                        const response = await fetch(`http://localhost:5000/users/session/${decoded.id}`);
                        const data = await response.json();
                        if (response.ok) {
                            setUser(data);
                        } else {
                            console.log('Session invalide, redirection...');
                            localStorage.removeItem('jwt-token');
                            window.location.href = '/login';
                        }
                    } catch (error) {
                        console.log('Erreur lors de la récupération de l’utilisateur:', error);
                        window.location.href = '/login';
                    }
                };

                fetchUser();
            } catch (error) {
                console.log('Token invalide:', error);
                localStorage.removeItem('jwt-token');
                window.location.href = '/login';
            }
        } else {
            window.location.href = '/login'; 
        }
    }, []);

    return user;
};

function Home() {
    const user = useAuth(); 

   

    return (
        <div>
            {/* Navbar avec bouton de déconnexion à droite, au même niveau que navbar-toggler */}
            <nav className="navbar navbar-expand-lg navbar-light bg-light">
                <div className="container-fluid d-flex justify-content-between align-items-center">
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-auto">
                            {/* Bouton de déconnexion à droite */}
                            {user && (
                                <li className="nav-item">
                                   
                                </li>
                            )}
                        </ul>
                    </div>
                </div>
            </nav>
            <main className="main">
                {/* Hero area */}
                <div className="hero-section">
    <div className="hero-single" style={{ backgroundImage: "url(assets/img/hero/bg.png)" }}>
        <div className="container">
            <div className="row align-items-center">
                <div className="col-md-12 col-lg-6">
                    <div className="hero-content">

                        <h1 className="hero-title" data-animation="fadeInRight" data-delay=".50s">
                            Nurturing Minds, Empowering Futures – Mental Health Care for ESPRIT Students
                        </h1>
                        <p data-animation="fadeInLeft" data-delay=".75s">
                            Prioritizing your mental well-being, ESPRITCare offers the support and tools to help students thrive both academically and emotionally.
                        </p>
                        <div className="hero-btn" data-animation="fadeInUp" data-delay="1s">
                            <a href="/About" className="theme-btn">
                                Discover Our Services
                                <i className="fas fa-circle-arrow-right"></i>
                            </a>
                            <a href="contact.html" className="theme-btn2">
                                Reach Out for Support
                                <i className="fas fa-circle-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
                <div className="col-md-12 col-lg-6">
                    <div className="hero-img">
                        <img src="assets/img/hero/01.jpg" alt="" />
                    </div>
                </div>
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
