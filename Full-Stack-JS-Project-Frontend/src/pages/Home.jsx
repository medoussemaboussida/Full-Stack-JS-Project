import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; 

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

    const handleLogout = () => {
        localStorage.removeItem('jwt-token');
        window.location.href = '/login';
    };

    return (
        <div>
            {/* Navbar avec bouton de déconnexion à droite, au même niveau que navbar-toggler */}
            <nav className="navbar navbar-expand-lg navbar-light bg-light">
                <div className="container-fluid d-flex justify-content-between align-items-center">
                    <a className="navbar-brand" href="/">Brand</a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-auto">
                            {/* Bouton de déconnexion à droite */}
                            {user && (
                                <li className="nav-item">
                                    <button
                                        onClick={handleLogout}
                                        className="btn btn-success"
                                        style={{
                                            marginTop: '20px',
                                            padding: '10px 20px',
                                        }}
                                    >
                                        Logout
                                    </button>
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
                                            We Are Providing Best <span>Quality</span> Care For Seniors
                                        </h1>
                                        <p data-animation="fadeInLeft" data-delay=".75s">
                                            There are many variations of passages orem psum available but the majority
                                            have suffered alteration in some form by injected humour.
                                        </p>
                                        <div className="hero-btn" data-animation="fadeInUp" data-delay="1s">
                                            <a href="about.html" className="theme-btn">
                                                About More
                                                <i className="fas fa-circle-arrow-right"></i>
                                            </a>
                                            <a href="contact.html" className="theme-btn2">
                                                Learn More
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
            </main>
        </div>
    );
}

export default Home;
