import React, { useEffect } from 'react';

function AccountDisabled() {
  useEffect(() => {
    // Hide the header and footer when on this page
    const navbar = document.querySelector(".header");
    const footer = document.querySelector("footer");
    if (navbar) navbar.style.display = "none";
    if (footer) footer.style.display = "none";

    // Restore the header and footer when leaving the page
    return () => {
      if (navbar) navbar.style.display = "block";
      if (footer) footer.style.display = "block";
    };
  }, []);

  return (
    <div className="account-disabled-container">
      <div className="account-message">
        <h1>Your account has been disabled.</h1>
        <p>Please contact the admin to resolve this issue.</p>
        <div className="sad-smiley">😞</div>
      </div>
    </div>
  );
}

export default AccountDisabled;