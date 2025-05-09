import React from 'react';
import '../App.css'; // Assuming you’ll extract footer-specific CSS

const Footer = () => {
    return (
        <footer className="footer-area">
            <div className="footer-widget">
                <div className="container">
                    <div className="footer-widget-wrap pt-100 pb-80">
                        <div className="row g-4">
                            <div className="col-lg-5">
                                <div className="footer-widget-box about-us">
                                    <a href="#" className="footer-logo">
                                        <img src="/assets/img/logo/logo.png" alt="" />
                                    </a>
                                    <p className="mb-4">
                                        We are many variations of passages available but the majority have suffered
                                        alteration some form by injected humour words believable.
                                    </p>
                                    <div className="footer-newsletter">
                                        <h6>Subscribe Our Newsletter</h6>
                                        <div className="newsletter-form">
                                            <form action="#">
                                                <div className="form-group">
                                                    <div className="form-icon">
                                                        <i className="far fa-envelopes"></i>
                                                        <input type="email" className="form-control" placeholder="Your Email" />
                                                        {/* <button className="theme-btn" type="submit">
                                                            Subscribe <span className="far fa-paper-plane"></span>
                                                        </button> */}
                                                    </div>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-6 col-lg-2">
                                <div className="footer-widget-box list">
                                    <h4 className="footer-widget-title">Company</h4>
                                    <ul className="footer-list">
                                        <li><a href="/about"><i className="far fa-angle-double-right"></i>About Us</a></li>
                                        <li><a href="/blog"><i className="far fa-angle-double-right"></i>Update News</a></li>
                                        <li><a href="/testimonial"><i className="far fa-angle-double-right"></i>Testimonials</a></li>
                                        <li><a href="/contact"><i className="far fa-angle-double-right"></i>Contact Us</a></li>
                                        <li><a href="/terms"><i className="far fa-angle-double-right"></i>Terms Of Service</a></li>
                                        <li><a href="/privacy"><i className="far fa-angle-double-right"></i>Privacy policy</a></li>
                                    </ul>
                                </div>
                            </div>
                            <div className="col-6 col-lg-2">
                                <div className="footer-widget-box list">
                                    <h4 className="footer-widget-title">Services</h4>
                                    <ul className="footer-list">
                                        <li><a href="/service"><i className="far fa-angle-double-right"></i>Assisted Living</a></li>
                                        <li><a href="/service"><i className="far fa-angle-double-right"></i>Nursing Care</a></li>
                                        <li><a href="/service"><i className="far fa-angle-double-right"></i>Medical & Health</a></li>
                                        <li><a href="/service"><i className="far fa-angle-double-right"></i>Physical Assistance</a></li>
                                        <li><a href="/service"><i className="far fa-angle-double-right"></i>Residential Care</a></li>
                                        <li><a href="/service"><i className="far fa-angle-double-right"></i>Personal Care</a></li>
                                    </ul>
                                </div>
                            </div>
                            <div className="col-lg-3">
                                <div className="footer-widget-box">
                                    <h4 className="footer-widget-title">Get In Touch</h4>
                                    <ul className="footer-contact">
                                        <li>
                                            <div className="icon">
                                                <i className="far fa-location-dot"></i>
                                            </div>
                                            <div className="content">
                                                <h6>Our Address</h6>
                                                <p>25/AB Milford Road, New York, USA</p>
                                            </div>
                                        </li>
                                        <li>
                                            <div className="icon">
                                                <i className="far fa-phone"></i>
                                            </div>
                                            <div className="content">
                                                <h6>Call Us</h6>
                                                <a href="tel:+21236547898">+2 123 654 7898</a>
                                            </div>
                                        </li>
                                        <li>
                                            <div className="icon">
                                                <i className="far fa-envelope"></i>
                                            </div>
                                            <div className="content">
                                                <h6>Mail Us</h6>
                                                <a href="mailto:info@example.com">info@example.com</a>
                                            </div>
                                        </li>
                                    </ul>
                                    {/* If "Rogueshot here" is intentional, wrap it properly */}
                                    {/* <p>Rogueshot here</p> */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="container">
                <div className="copyright">
                    <div className="row">
                        <div className="col-md-6 align-self-center">
                            <p className="copyright-text">
                                © Copyright <span id="date">{new Date().getFullYear()}</span> <a href="#"> EspritCare </a> All Rights Reserved.
                            </p>
                        </div>
                        <div className="col-md-6 align-self-center">
                            <ul className="footer-social">
                                <li><a href="#"><i className="fab fa-facebook-f"></i></a></li>
                                <li><a href="#"><i className="fab fa-x-twitter"></i></a></li>
                                <li><a href="#"><i className="fab fa-linkedin-in"></i></a></li>
                                <li><a href="#"><i className="fab fa-youtube"></i></a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;