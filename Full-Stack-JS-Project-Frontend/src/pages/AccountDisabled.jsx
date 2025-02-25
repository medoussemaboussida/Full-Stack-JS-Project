import { Link } from "react-router-dom";
import React, { useEffect } from "react";

function AccountDisabled() {
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

  return (
    <div className="account-disabled-page">
      <div className="container">
        <div className="col-md-6 mx-auto">
          <div className="account-disabled-message">
            <h2>Your Account is Disabled</h2>
            <p>
              We're sorry, but your account has been disabled. Please contact
              support for further assistance or try to resolve the issue.
            </p>
            <div className="support-link">
              <p>If you think this is a mistake, you can:</p>
              <a
                href="mailto:espritcare@gmail.com?subject=Account Disabled&body=Hello, I believe my account has been mistakenly disabled. Please assist."
                className="btn btn-primary"
              >
                Contact Support
              </a>
            </div>
            <div className="back-to-home">
              <p>Go back to the <Link to="/login">Login Page</Link></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountDisabled;
