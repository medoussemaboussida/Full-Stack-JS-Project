import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

function VerifyAccount() {
  const { token } = useParams(); // Récupérer le token depuis l'URL
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      // Stocker le token dans le localStorage
      localStorage.setItem("jwt-token", token);

      // Appeler l'API pour récupérer l'utilisateur
      fetch(`http://localhost:5000/users/getStudentBytoken/${token}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.message) {
            alert("Erreur: " + data.message); // Afficher une erreur si l'utilisateur n'est pas trouvé
          } else {
            setUser(data); // Stocker les infos de l'utilisateur dans le state
            localStorage.setItem("loggedUser",user)
            navigate("/home")
          }
        })
        .catch((error) => {
          console.error("Erreur lors de la requête:", error);
        });
    }
  }, [token]);

  return (
    <div>
    </div>
  );
}

export default VerifyAccount;
