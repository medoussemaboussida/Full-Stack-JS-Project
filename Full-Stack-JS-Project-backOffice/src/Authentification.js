import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Ajout de l'état de chargement
  const navigate = useNavigate(); // Utilisation de useNavigate pour la redirection

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");

    console.log("Token trouvé :", token); // Vérifie si le token est dans localStorage

    if (!token) {
      console.log("Aucun token trouvé, redirection vers /login");
      window.location.href = `http://localhost:3000/login`; 
      setLoading(false); // Fin du chargement
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      console.log("Token décodé :", decoded); // Log du contenu du token décodé

      if (decoded.exp < currentTime) {
        console.warn("Token expiré. Redirection vers /login");
        localStorage.removeItem("jwt-token");
        window.location.href = `http://localhost:3000/login`; 
        setLoading(false); // Fin du chargement
        return;
      }

      const fetchUser = async () => {
        try {
          console.log("Appel API pour récupérer l'utilisateur...");
          const response = await fetch(
            `http://localhost:5000/users/session/${decoded.id}`
          );
          const data = await response.json();
          

          if (response.ok) {
            console.log("Utilisateur récupéré :", data); // Affiche les données utilisateur récupérées
            setUser(data);
          } else {
            console.error("Session invalide, redirection...");
            localStorage.removeItem("jwt-token");
            window.location.href = `http://localhost:3000/login`; 
          }
        } catch (error) {
          console.error("Erreur lors de la récupération de l’utilisateur:", error);
          window.location.href = `http://localhost:3000/login`; 
        } finally {
          setLoading(false); // Fin du chargement
        }
      };

      fetchUser();
    } catch (error) {
      console.error("Token invalide:", error);
      localStorage.removeItem("jwt-token");
      window.location.href = `http://localhost:3000/login`; 
      setLoading(false); // Fin du chargement
    }
  }, [navigate]);

  return { user, loading }; // Retourne aussi l'état de chargement
};

export default useAuth;
