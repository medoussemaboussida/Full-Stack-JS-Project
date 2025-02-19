import React from 'react';

function Login() {
    return (
        <div>
            {/* preloader */}
            <div className="preloader">
                <div className="loader-ripple">
                    <div></div>
                    <div></div>
                </div>
            </div>
            {/* preloader end */}

            {/* header area */}
            <header className="header">
         

                
            </header>
            {/* header area end */}

            {/* popup search */}
            <div className="search-popup">
                <button className="close-search">
                    <span className="far fa-times"></span>
                </button>
                <form action="#">
                    <div className="form-group">
                        <input type="search" name="search-field" className="form-control" placeholder="Search Here..." required />
                        <button type="submit">
                            <i className="far fa-search"></i>
                        </button>
                    </div>
                </form>
            </div>
            {/* popup search end */}

            {/* sidebar-popup */}
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
                                There are many variations of passages available sure there majority have suffered alteration in
                                some form by inject humour or randomised words which don't look even slightly believable.
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
                            <a href="#"><i className="fab fa-facebook"></i></a>
                            <a href="#"><i className="fab fa-x-twitter"></i></a>
                            <a href="#"><i className="fab fa-instagram"></i></a>
                            <a href="#"><i className="fab fa-linkedin"></i></a>
                        </div>
                    </div>
                </div>
            </div>
            {/* sidebar-popup end */}

            <main className="main">
                {/* breadcrumb */}
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Login</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="index.html">Home</a></li>
                            <li className="active">Login</li>
                        </ul>
                    </div>
                </div>
                {/* breadcrumb end */}

                {/* login area */}
                <div className="auth-area py-120">
                    <div className="container">
                        <div className="col-md-5 mx-auto">
                            <div className="auth-form">
                                <div className="auth-header">
                                    <img src="assets/img/logo/logo.png" alt="" />
                                    <p>Login with your lovcare account</p>
                                </div>
                                <form action="#">
                                    <div className="form-group">
                                        <div className="form-icon">
                                            <i className="far fa-envelope"></i>
                                            <input type="email" className="form-control" placeholder="Your Email" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <div className="form-icon">
                                            <i className="far fa-key"></i>
                                            <input type="password" id="password" className="form-control" placeholder="Your Password" />
                                            <span className="password-view">
                                                <i className="far fa-eye-slash"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="auth-group">
                                        <div className="form-check">
                                            <input className="form-check-input" type="checkbox" value="" id="remember" />
                                            <label className="form-check-label" htmlFor="remember">
                                                Remember Me
                                            </label>
                                        </div>
                                        <a href="forgot-password.html" className="auth-group-link">
                                            Forgot Password?
                                        </a>
                                    </div>
                                    <div className="auth-btn">
                                        <button type="submit" className="theme-btn">
                                            <span className="far fa-sign-in"></span> Login
                                        </button>
                                    </div>
                                </form>
                                <div className="auth-bottom">
                                    <div className="auth-social">
                                        <p>Continue with social media</p>
                                        <div className="auth-social-list">
                                            <a href="#"><i className="fab fa-facebook-f"></i></a>
                                            <a href="#"><i className="fab fa-google"></i></a>
                                            <a href="#"><i className="fab fa-x-twitter"></i></a>
                                        </div>
                                    </div>
                                    <p className="auth-bottom-text">
                                        Don't have an account? <a href="register.html">Register.</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* login area end */}
            </main>
        </div>
    );
}

export default Login;