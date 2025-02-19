import React from 'react';

function Home() {
    return (
        <div>
            {/* Popup search */}
            <div className="search-popup">
                <button className="close-search">
                    <span className="far fa-times"></span>
                </button>
                <form action="#">
                    <div className="form-group">
                        <input
                            type="search"
                            name="search-field"
                            className="form-control"
                            placeholder="Search Here..."
                            required
                        />
                        <button type="submit">
                            <i className="far fa-search"></i>
                        </button>
                    </div>
                </form>
            </div>
            {/* Popup search end */}

            {/* Sidebar-popup */}
            <div className="sidebar-popup offcanvas offcanvas-end" tabIndex="-1" id="sidebarPopup">
                <div className="offcanvas-header">
                    <a href="index.html" className="sidebar-popup-logo">
                        <img src="assets/img/logo/logo.png" alt="" />
                    </a>
                    <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close">
                        <i className="far fa-xmark"></i>
                    </button>
                </div>
                <div className="sidebar-popup-wrap offcanvas-body">
                    <div className="sidebar-popup-content">
                        <div className="sidebar-popup-about">
                            <h4>About Us</h4>
                            <p>
                                There are many variations of passages available sure there majority have suffered
                                alteration in some form by inject humour or randomised words which don't look even
                                slightly believable.
                            </p>
                        </div>
                        <div className="sidebar-popup-contact">
                            <h4>Contact Info</h4>
                            <ul>
                                <li>
                                    <div className="icon">
                                        <i className="far fa-envelope"></i>
                                    </div>
                                    <div className="content">
                                        <h6>Email</h6>
                                        <a href="mailto:info@example.com">info@example.com</a>
                                    </div>
                                </li>
                                <li>
                                    <div className="icon">
                                        <i className="far fa-phone"></i>
                                    </div>
                                    <div className="content">
                                        <h6>Phone</h6>
                                        <a href="tel:+21236547898">+2 123 654 7898</a>
                                    </div>
                                </li>
                                <li>
                                    <div className="icon">
                                        <i className="far fa-location-dot"></i>
                                    </div>
                                    <div className="content">
                                        <h6>Address</h6>
                                        <a href="#">25/B Milford Road, New York</a>
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <div className="sidebar-popup-social">
                            <h4>Follow Us</h4>
                            <a href="#">
                                <i className="fab fa-facebook"></i>
                            </a>
                            <a href="#">
                                <i className="fab fa-x-twitter"></i>
                            </a>
                            <a href="#">
                                <i className="fab fa-instagram"></i>
                            </a>
                            <a href="#">
                                <i className="fab fa-linkedin"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            {/* Sidebar-popup end */}

            <main className="main">
                {/* Hero area */}
                <div className="hero-section">
                    <div className="hero-single" style={{ backgroundImage: "url(assets/img/hero/bg.png)" }}>
                        <div className="container">
                            <div className="row align-items-center">
                                <div className="col-md-12 col-lg-6">
                                    <div className="hero-content">
                                        <h6 className="hero-sub-title" data-animation="fadeInUp" data-delay=".25s">
                                            <i className="far fa-hand-heart"></i> Welcome to Lovcare!
                                        </h6>
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
