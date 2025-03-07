import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt } from '@fortawesome/free-regular-svg-icons'; // Importation des icônes Font Awesome

function Forum() {
    const [forums, setForums] = useState([]);
    const [token, setToken] = useState(null);
    const [userId, setUserId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("jwt-token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000; // En secondes

                // Vérifier si le token est expiré
                if (decoded.exp < currentTime) {
                    console.log("Token expiré.");
                    localStorage.removeItem("jwt-token");
                    return;
                }

                setToken(token); // Sauvegarder le token valide
                setUserId(decoded.id); // Récupérer l'id de l'utilisateur depuis le token
            } catch (error) {
                console.error("Erreur de décodage du token:", error);
                localStorage.removeItem("jwt-token");
            }
        } else {
            console.log("Aucun token trouvé.");
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const forumsResponse = await fetch("http://localhost:5000/forum/getForum");
                const forumsData = await forumsResponse.json();
                setForums(forumsData);
            } catch (error) {
                console.error("Erreur lors de la récupération des données:", error);
            }
        };

        fetchData();
    }, []);

    // Log pour vérifier les données
    useEffect(() => {
        console.log("User ID:", userId);
        console.log("Forums:", forums);
    }, [userId, forums]);

    return (
        <div>
            <main className="main">
                {/* Breadcrumb */}
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Forum</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="/Home">Home</a></li>
                            <li className="active">Forum</li>
                        </ul>
                    </div>
                </div>

                {/* Forum Section */}
                <div className="forum-area py-100">
                    <div className="container">
                        <div className="forum-header d-flex justify-content-between align-items-center mb-4">
                            <button className="theme-btn" onClick={() => navigate("/addforum")}>
                                Add New Topic
                            </button>
                        </div>

                        <div className="forum-list">
                            {forums.length > 0 ? (
                                forums.map((forum) => (
                                    <div key={forum._id} className="forum-item p-3 border rounded mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div className="d-flex align-items-center">
                                                <img src="assets/img/user_icon.png" alt="User" width="30" height="30" className="rounded-circle me-2" />
                                                <h5 className="mb-0">
                                                    {forum.anonymous ? "Anonymous member" : forum.user_id.username || "Utilisateur inconnu"}
                                                </h5>
                                            </div>
                                            
                                            {/* Icônes alignées à droite */}
                                            {userId && forum.user_id && userId === forum.user_id._id && (
                                                <div className="forum-actions">
                                                    <span 
                                                        className="icon" 
                                                        style={{ cursor: "pointer", fontSize: "20px", color: "#007bff", marginRight: "15px" }}
                                                        onClick={() => navigate(`/updateForum/${forum._id}`)} // Redirection vers la page de mise à jour
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} /> {/* Icône Edit */}
                                                    </span>
                                                    <span 
                                                        className="icon" 
                                                        style={{ cursor: "pointer", fontSize: "20px", color: "red" }}
                                                        onClick={async () => {
                                                            try {
                                                                await fetch(`http://localhost:5000/forum/deleteForum/${forum._id}`, { method: 'DELETE' });
                                                                setForums(forums.filter(f => f._id !== forum._id)); // Mise à jour de l'état après suppression
                                                            } catch (error) {
                                                                console.error("Erreur lors de la suppression du forum:", error);
                                                            }
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faTrashAlt} /> {/* Icône Delete */}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <h2>{forum.title}</h2>
                                        <p className="mb-0 text-muted">{forum.description}</p>
                                        {forum.forum_photo && (
                                            <img src={forum.forum_photo} alt="Forum" className="forum-photo mt-2" style={{ width: "100%", height: "auto", borderRadius: "20px" }} />
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p>Aucun forum disponible.</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Forum;
