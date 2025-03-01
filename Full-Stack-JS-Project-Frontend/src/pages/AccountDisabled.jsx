import { Link } from "react-router-dom";
import React, { useEffect } from "react";
import { Card, Button, Container } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

function AccountDisabled() {
  // Define the image paths
  const image = "/assets/img/gallery/09.jpg"; // Background image
  const logo = "/assets/img/logo/logo.png";  // Logo image

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

  // Style with the background image
  const pageStyles = {
    background: `url(${image}) no-repeat center center`,
    backgroundSize: 'cover',
    height: '100vh',
  };

  return (
    <div className="account-disabled-page" style={pageStyles}>
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <Card className="text-center p-4 shadow-lg account-disabled-card">
          <Card.Body>
            {/* Logo Section */}
            <div className="logo-container mb-4">
              <img src={logo} alt="Logo" className="logo" />
            </div>

            <Card.Title className="mb-3">Your Account is Disabled ❌</Card.Title>
            <Card.Text>
              We're sorry, but your account has been disabled. Please contact
              support for further assistance or try to resolve the issue.
            </Card.Text>
            <div className="mb-3">
              <p>If you think this is a mistake, you can:</p>
              <a
                href="mailto:espritcare@gmail.com?subject=Account Disabled&body=Hello, I believe my account has been mistakenly disabled. Please assist."
                className="btn btn-primary"
              >
                Contact Support
              </a>
            </div>
            <Link to="/login">
              <Button variant="secondary">Back to Login</Button>
            </Link>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default AccountDisabled;
