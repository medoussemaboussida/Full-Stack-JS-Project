import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; 
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt } from '@fortawesome/free-regular-svg-icons'; // Importation des icônes Font Awesome

function Forum() {
    const [forums, setForums] = useState([]);
    const [token, setToken] = useState(null);
    const [userId, setUserId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false); // État pour afficher le modal de suppression
    const [showUpdateModal, setShowUpdateModal] = useState(false); // État pour afficher le modal de mise à jour
    const [forumToDelete, setForumToDelete] = useState(null); // Forum à supprimer
    const [forumToUpdate, setForumToUpdate] = useState(null); // Forum à mettre à jour
    const [updatedTitle, setUpdatedTitle] = useState(''); // Valeur pour mettre à jour le titre
    const [updatedDescription, setUpdatedDescription] = useState(''); // Valeur pour mettre à jour la description
    const [updatedPhoto, setUpdatedPhoto] = useState(null); // Valeur pour mettre à jour la photo du forum
    const [updatedAnonymous, setUpdatedAnonymous] = useState(false); // Valeur pour mettre à jour l'option "anonyme"
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

    const handleDelete = (forumId) => {
        // Appel API pour supprimer le forum (à adapter selon votre API)
        fetch(`http://localhost:5000/forum/deleteForum/${forumId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(response => response.json())
        .then(data => {
            console.log("Forum supprimé:", data);
            setForums(forums.filter(forum => forum._id !== forumId)); // Supprimer localement
            setShowDeleteModal(false); // Fermer le modal
        })
        .catch(error => {
            console.error("Erreur lors de la suppression du forum:", error);
        });
    };

    const handleUpdate = (forumId) => {
        const formData = new FormData();
        formData.append('title', updatedTitle);
        formData.append('description', updatedDescription);
        formData.append('anonymous', updatedAnonymous);

        if (updatedPhoto) {
            formData.append('forum_photo', updatedPhoto);
        }

        fetch(`http://localhost:5000/forum/updateForum/${forumId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            console.log("Forum mis à jour:", data);
            setForums(forums.map(forum => 
                forum._id === forumId ? { ...forum, title: updatedTitle, description: updatedDescription, forum_photo: updatedPhoto ? URL.createObjectURL(updatedPhoto) : forum.forum_photo, anonymous: updatedAnonymous } : forum
            ));
            setShowUpdateModal(false); // Fermer le modal de mise à jour
        })
        .catch(error => {
            console.error("Erreur lors de la mise à jour du forum:", error);
        });
    };

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

                                            {/* Alignement des icônes à droite */}
                                            {userId && forum.user_id && userId === forum.user_id._id && (
                                                <div className="d-flex align-items-center">
                                                    <span 
                                                        className="icon" 
                                                        style={{ cursor: "pointer", fontSize: "20px", color: "#007bff", marginRight: "15px" }}
                                                        onClick={() => {
                                                            setForumToUpdate(forum); // Définir le forum à mettre à jour
                                                            setUpdatedTitle(forum.title); // Pré-remplir le titre
                                                            setUpdatedDescription(forum.description); // Pré-remplir la description
                                                            setUpdatedAnonymous(forum.anonymous); // Pré-remplir l'option anonyme
                                                            setShowUpdateModal(true); // Afficher le modal d'édition
                                                        }}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} /> {/* Icône Edit */}
                                                    </span>
                                                    <span 
                                                        className="icon" 
                                                        style={{ cursor: "pointer", fontSize: "20px", color: "red" }}
                                                        onClick={() => { 
                                                            setForumToDelete(forum._id); // Définir le forum à supprimer
                                                            setShowDeleteModal(true); // Afficher le modal de confirmation
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

            {/* Modal de confirmation de suppression */}
            {showDeleteModal && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                    <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "400px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
                        <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Confirm Deletion</h3>
                        <p style={{ marginBottom: "20px", textAlign: "center" }}>Are you sure you want to delete this forum? This action cannot be undone.</p>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <button onClick={() => setShowDeleteModal(false)} style={{ backgroundColor: "#f44336", color: "white", padding: "10px 20px", borderRadius: "5px", border: "none", cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => handleDelete(forumToDelete)} style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", borderRadius: "5px", border: "none", cursor: "pointer" }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de mise à jour du forum */}
            {showUpdateModal && forumToUpdate && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
                    <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", width: "400px", maxWidth: "90%", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
                        <h3 style={{ marginBottom: "20px", textAlign: "center" }}>Update Forum</h3>
                        <div style={{ marginBottom: "15px" }}>
                            <label>Title:</label>
                            <input
                                type="text"
                                value={updatedTitle}
                                onChange={(e) => setUpdatedTitle(e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ddd" }}
                            />
                        </div>
                        <div style={{ marginBottom: "15px" }}>
                            <label>Description:</label>
                            <textarea
                                value={updatedDescription}
                                onChange={(e) => setUpdatedDescription(e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ddd", minHeight: "100px" }}
                            />
                        </div>
                        <div style={{ marginBottom: "15px" }}>
                            <label>Anonymous:</label>
                            <select
                                value={updatedAnonymous}
                                onChange={(e) => setUpdatedAnonymous(e.target.value === 'true')}
                                style={{ width: "100%", padding: "8px", borderRadius: "5px", border: "1px solid #ddd" }}
                            >
                                <option value="false">No</option>
                                <option value="true">Yes</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: "15px" }}>
                            <label>Forum Photo:</label>
                            <input
                                type="file"
                                onChange={(e) => setUpdatedPhoto(e.target.files[0])}
                                style={{ width: "100%" }}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                            <button onClick={() => setShowUpdateModal(false)} style={{ backgroundColor: "#f44336", color: "white", padding: "10px 20px", borderRadius: "5px", border: "none", cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => handleUpdate(forumToUpdate._id)} style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px 20px", borderRadius: "5px", border: "none", cursor: "pointer" }}>Update</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Forum;
