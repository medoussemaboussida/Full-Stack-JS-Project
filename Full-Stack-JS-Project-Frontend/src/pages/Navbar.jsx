import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css'; // Assuming you’ll extract footer-specific CSS

const Navbar = () => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('jwt-token');
        if (storedToken) {
            setToken(storedToken);
            fetchUserData(storedToken);
        }
    }, []);

    const fetchUserData = async (token) => {
        try {
            const response = await axios.get('http://localhost:5000/users/me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setUser(response.data);
        } catch (err) {
            console.error('Error fetching user data:', err);
        }
    };

    const logout = () => {
        console.log("Déconnexion en cours...");
        fetch('http://localhost:5000/logout', {
            method: 'POST',
            credentials: 'include',
        })
            .then(response => {
                if (response.ok) {
                    localStorage.removeItem('jwt-token');
                    console.log("Déconnexion réussie, redirection vers /login...");
                    window.location.href = '/login';
                } else {
                    console.error('Erreur lors de la déconnexion:', response.statusText);
                }
            })
            .catch(error => {
                console.error('Erreur lors de la déconnexion:', error);
            });
    };

    return (
        <header className="header">
            <div className="main-navigation">
                <nav className="navbar navbar-expand-lg">
                    <div className="container position-relative">
                        <a className="navbar-brand" href="/Home">
                            <img src="/assets/img/logo/logo.png" alt="logo" />
                        </a>
                        <div className="mobile-menu-right">
                            <div className="mobile-menu-btn">
                                <button type="button" className="nav-right-link search-box-outer">
                                    <i className="far fa-search"></i>
                                </button>
                            </div>
                            <button
                                className="navbar-toggler"
                                type="button"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasNavbar"
                                aria-controls="offcanvasNavbar"
                                aria-label="Toggle navigation"
                            >
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>
                        </div>
                        <div
                            className="offcanvas offcanvas-start"
                            tabIndex="-1"
                            id="offcanvasNavbar"
                            aria-labelledby="offcanvasNavbarLabel"
                        >
                            <div className="offcanvas-header">
                                <a href="/Home" className="offcanvas-brand" id="offcanvasNavbarLabel">
                                    <img src="/assets/img/logo/logo.png" alt="" />
                                </a>
                                <button
                                    type="button"
                                    className="btn-close"
                                    data-bs-dismiss="offcanvas"
                                    aria-label="Close"
                                >
                                    <i className="far fa-xmark"></i>
                                </button>
                            </div>
                            <div className="offcanvas-body gap-xl-4">
                                <ul className="navbar-nav justify-content-end flex-grow-1">
                                    <li className="nav-item">
                                        <a className="nav-link" href="/Home">Home</a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="/About">About</a>
                                    </li>
                                    <li className="nav-item">
                                        <a className="nav-link" href="/Publication">Publication</a>
                                    </li>
                                
                                    <li className="nav-item dropdown">
                                        <a className="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                                            Our Services
                                        </a>
                                        <ul className="dropdown-menu fade-down">
                                            <li><a className="dropdown-item" href="/about">About Us</a></li>
                                            <li><a className="dropdown-item" href="/team">Our Team</a></li>
                                            <li><a className="dropdown-item" href="/AddAvailabilityForm">Add Availability</a></li>
                                            <li><a className="dropdown-item" href="/Forum">Forum</a></li>
                                            <li><a className="dropdown-item" href="/Associations">Our Associations</a></li>
                                            <li><a className="dropdown-item" href="/events">Our Events</a></li>

                                            {/* Add other dropdown items as needed */}
                                        </ul>
                                    </li>


                                    
                                    <li className="nav-item dropdown">
                                        <a className="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                                            Activity
                                        </a>
                                        <ul className="dropdown-menu fade-down">
                                            <li><a className="dropdown-item" href="/Activities">Activities</a></li>
                                            <li><a className="dropdown-item" href="/activity-schedule">Activity Schedule</a></li>
                                            <li><a className="dropdown-item" href="/Exercices">Exercices</a></li>
                                            <li><a className="dropdown-item" href="/SleepCalculator">Sleep Calculator</a></li>
                                            <li><a className="dropdown-item" href="/StudentDashboard">Student Dashboard</a></li>
                                            <li><a className="dropdown-item" href="/list-problems">problem management </a></li>

                                        </ul>
                                    </li>
                                    <li className="nav-item dropdown">
                                        <a className="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                                            Appointment
                                        </a>
                                        <ul className="dropdown-menu fade-down">
                                            <li><a className="dropdown-item" href="/appointment-history">History</a></li>
                                            <li><a className="dropdown-item" href="/chat">Chat</a></li>
                                        </ul>
                                    </li>


                                



                                </ul>
                                <div className="nav-right">
                                    <div className="search-btn">
                                        <button type="button" className="nav-right-link search-box-outer">
                                            <i className="far fa-search"></i>
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: '15px' }}>
                                        <img
                                            id="user-avatar"
                                            src={user?.user_photo ? `http://localhost:5000${user.user_photo}` : '/assets/img/user_icon.png'}
                                            alt="User Avatar"
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                objectFit: 'cover',
                                            }}
                                            onClick={() => window.location.href = '/student'}
                                        />
                                    </div>
                                    <li className="nav-item ms-3">
                                        <button className="btn btn-danger" onClick={(e) => { e.preventDefault(); logout(); }}>
                                            <i className="fas fa-sign-out-alt"></i>
                                        </button>
                                    </li>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default Navbar;