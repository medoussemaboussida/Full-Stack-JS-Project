import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
  faPaperPlane,
  faEye,
} from "@fortawesome/free-regular-svg-icons"; // Importation des icônes Font Awesome

// Fonction pour couper la description à 3 lignes
const truncateDescription = (text, isExpanded) => {
  if (!isExpanded) {
    return `${text.substring(0, 150)}...`; // Vous pouvez ajuster le nombre de caractères ou utiliser une méthode CSS pour couper après 3 lignes
  }
  return text;
};
function Forum() {
  const [forums, setForums] = useState([]);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false); // État pour afficher le modal de suppression
  const [showUpdateModal, setShowUpdateModal] = useState(false); // État pour afficher le modal de mise à jour
  const [forumToDelete, setForumToDelete] = useState(null); // Forum à supprimer
  const [forumToUpdate, setForumToUpdate] = useState(null); // Forum à mettre à jour
  const [updatedTitle, setUpdatedTitle] = useState(""); // Valeur pour mettre à jour le titre
  const [updatedDescription, setUpdatedDescription] = useState(""); // Valeur pour mettre à jour la description
  const [updatedPhoto, setUpdatedPhoto] = useState(null); // Valeur pour mettre à jour la photo du forum
  const [updatedAnonymous, setUpdatedAnonymous] = useState(false); // Valeur pour mettre à jour l'option "anonyme"
  const [comment, setComment] = useState(""); // État pour le commentaire
  const [expanded, setExpanded] = useState({}); // Suivi de l'état d'expansion de chaque forum
  const [anonymous, setAnonymous] = useState(false);
  const [comments, setComments] = useState([]); // Pour stocker les commentaires
  const [showCommentModal, setShowCommentModal] = useState(false); // Pour contrôler l'affichage du modal des commentaires
  const [forumIdForComments, setForumIdForComments] = useState(null); // Pour stocker l'ID du forum actuel

  const navigate = useNavigate();

  // Fonction pour basculer l'état d'expansion
  const toggleDescription = (forumId) => {
    setExpanded((prev) => ({
      ...prev,
      [forumId]: !prev[forumId], // Inverse l'état d'expansion pour ce forum
    }));
  };

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

  //affichage forum
  useEffect(() => {
    const fetchData = async () => {
      try {
        const forumsResponse = await fetch(
          "http://localhost:5000/forum/getForum"
        );
        const forumsData = await forumsResponse.json();
        setForums(forumsData);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      }
    };

    fetchData();
  }, []);

  //ajouter commentaire a un forum
  const handleAddComment = async (forumId, content, anonymous) => {
    if (!userId) {
      console.log("User not authenticated.");
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/addComment/${userId}/${forumId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content, anonymous }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        console.log("Comment added:", data);
        setComment(""); // Clear the comment field
      } else {
        console.error("Error adding comment:", data.message || data);
      }
    } catch (error) {
      console.error("Error in API call:", error);
    }
  };

  //afficher les comments :
  const handleViewComments = async (forumId) => {
    try {
      const response = await fetch(
        `http://localhost:5000/forumComment/getComment/${forumId}`
      );
      const data = await response.json();

      if (response.ok) {
        setComments(data); // Enregistrer les commentaires
        setForumIdForComments(forumId); // Enregistrer l'ID du forum pour référence
        setShowCommentModal(true); // Ouvrir le modal
      } else {
        console.error(
          "Erreur lors de la récupération des commentaires:",
          data.message || data
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'appel API:", error);
    }
  };

  //delete forum
  const handleDelete = (forumId) => {
    fetch(`http://localhost:5000/forum/deleteForum/${forumId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Forum supprimé:", data);
        setForums(forums.filter((forum) => forum._id !== forumId)); // Supprimer localement
        setShowDeleteModal(false); // Fermer le modal
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression du forum:", error);
      });
  };

  //update forum
  const handleUpdate = (forumId) => {
    const formData = new FormData();
    formData.append("title", updatedTitle);
    formData.append("description", updatedDescription);
    formData.append("anonymous", updatedAnonymous);

    if (updatedPhoto) {
      formData.append("forum_photo", updatedPhoto);
    }

    fetch(`http://localhost:5000/forum/updateForum/${forumId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Forum mis à jour:", data);
        setForums(
          forums.map((forum) =>
            forum._id === forumId
              ? {
                  ...forum,
                  title: updatedTitle,
                  description: updatedDescription,
                  forum_photo: updatedPhoto
                    ? URL.createObjectURL(updatedPhoto)
                    : forum.forum_photo,
                  anonymous: updatedAnonymous,
                }
              : forum
          )
        );
        setShowUpdateModal(false); // Fermer le modal de mise à jour
      })
      .catch((error) => {
        console.error("Erreur lors de la mise à jour du forum:", error);
      });
  };

  return (
    <div>
      <main className="main">
        {/* Breadcrumb */}
        <div
          className="site-breadcrumb"
          style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}
        >
          <div className="container">
            <h2 className="breadcrumb-title">Forum</h2>
            <ul className="breadcrumb-menu">
              <li>
                <a href="/Home">Home</a>
              </li>
              <li className="active">Forum</li>
            </ul>
          </div>
        </div>

        {/* Forum Section */}
        <div className="forum-area py-100">
          <div className="container">
            <div className="forum-header d-flex justify-content-between align-items-center mb-4">
              <button
                className="theme-btn"
                onClick={() => navigate("/addforum")}
              >
                Add New Topic
              </button>
            </div>

            <div className="forum-list">
              {forums.length > 0 ? (
                forums.map((forum) => (
                  <div
                    key={forum._id}
                    className="forum-item p-3 border rounded mb-3"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center">
                        <img
                          src={
                            forum.anonymous
                              ? "assets/img/user_icon.png"
                              : `http://localhost:5000/uploads/${forum.user_id.user_photo}`
                          }
                          alt="User"
                          className="rounded-circle me-2"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover", // Cela garantit que l'image est redimensionnée pour garder un bon aspect circulaire
                          }}
                        />

                        <h5 className="mb-0 me-3">
                          {forum.anonymous
                            ? "Anonymous member"
                            : forum.user_id.username || "Utilisateur inconnu"}
                        </h5>
                        {!forum.anonymous &&
                          forum.user_id.level &&
                          forum.user_id.speciality && (
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "transparent",
                                border: "1px solid #00BFFF", // Cadre bleu
                                color: "#00BFFF", // Texte bleu
                                padding: "2px 8px",
                                borderRadius: "20px",
                                boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)", // Lueur bleue
                                fontSize: "0.875rem", // Petit texte
                              }}
                            >
                              {forum.user_id.level} {forum.user_id.speciality}
                            </span>
                          )}
                      </div>

                      {/* Alignement des icônes à droite */}
                      {userId &&
                        forum.user_id &&
                        userId === forum.user_id._id && (
                          <div className="d-flex align-items-center">
                            <span
                              className="icon"
                              style={{
                                cursor: "pointer",
                                fontSize: "20px",
                                color: "#007bff",
                                marginRight: "15px",
                              }}
                              onClick={() => {
                                setForumToUpdate(forum); // Définir le forum à mettre à jour
                                setUpdatedTitle(forum.title); // Pré-remplir le titre
                                setUpdatedDescription(forum.description); // Pré-remplir la description
                                setUpdatedAnonymous(forum.anonymous); // Pré-remplir l'option anonyme
                                setShowUpdateModal(true); // Afficher le modal d'édition
                              }}
                            >
                              <FontAwesomeIcon icon={faEdit} />{" "}
                              {/* Icône Edit */}
                            </span>
                            <span
                              className="icon"
                              style={{
                                cursor: "pointer",
                                fontSize: "20px",
                                color: "red",
                              }}
                              onClick={() => {
                                setForumToDelete(forum._id); // Définir le forum à supprimer
                                setShowDeleteModal(true); // Afficher le modal de confirmation
                              }}
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />{" "}
                              {/* Icône Delete */}
                            </span>
                          </div>
                        )}
                    </div>
                    <h2>{forum.title}</h2>
                    <br />
                    <p
                      className="forum-description mb-0 "
                      style={{
                        fontSize: "18px" /* Augmente la taille de la police */,
                        color: "black" /* Change la couleur du texte en noir */,
                        lineHeight:
                          "1.5" /* Optionnel : espacement entre les lignes */,
                      }}
                    >
                      {truncateDescription(
                        forum.description,
                        expanded[forum._id]
                      )}
                      {/* Ajouter le bouton "Voir plus/moins" */}
                      {forum.description.length > 150 && (
                        <button
                          onClick={() => toggleDescription(forum._id)}
                          style={{
                            color: "#007bff",
                            fontSize: "18px",
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                          }}
                        >
                          {expanded[forum._id] ? "See less" : "See more"}
                        </button>
                      )}
                    </p>{" "}
                    {forum.forum_photo && (
                      <img
                        src={forum.forum_photo}
                        alt="Forum"
                        className="forum-photo mt-2"
                        style={{
                          width: "100%",
                          height: "auto",
                          objectFit: "cover", // Cela garantit que l'image est redimensionnée pour garder un bon aspect circulaire
                          borderRadius: "20px",
                        }}
                      />
                    )}
                    <div className="d-flex align-items-center mt-2">
                      {/* Champ de saisie du commentaire */}
                      <input
                        type="text"
                        placeholder="Type your comment..."
                        className="form-control rounded-pill me-2"
                        style={{
                          border: "1px solid #007bff",
                          paddingLeft: "10px",
                          fontSize: "14px",
                          maxWidth: "90%",
                        }}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                      />

                      {/* Bouton d'envoi avec icône */}
                      <button
                        onClick={() =>
                          handleAddComment(forum._id, comment, anonymous)
                        }
                        className="btn btn-primary d-flex align-items-center justify-content-center"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%", // Bouton circulaire
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "5px",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faPaperPlane}
                          style={{ fontSize: "16px" }}
                        />
                      </button>
                      {/* Bouton "view" avec icône */}
                      <button
                        onClick={() => handleViewComments(forum._id)}
                        className="btn btn-secondary d-flex align-items-center justify-content-center ms-2"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%", // Bouton circulaire
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "5px",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faEye}
                          style={{ fontSize: "16px" }}
                        />
                      </button>
                    </div>
                    {/* Checkbox pour commenter en anonyme */}
                    <div className="mt-2 d-flex align-items-center">
                      <input
                        type="checkbox"
                        id="anonymousComment"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%", // Case circulaire
                          border: "2px solid black", // Bordure noire
                          appearance: "none", // Supprime le style par défaut
                          outline: "none",
                          cursor: "pointer",
                          backgroundColor: anonymous ? "green" : "white",
                          display: "inline-block",
                          marginRight: "10px",
                        }}
                      />
                      <label
                        htmlFor="anonymousComment"
                        style={{
                          fontSize: "14px",
                          color: "black",
                          cursor: "pointer",
                        }}
                      >
                        Anonymous comment ?
                      </label>
                    </div>
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
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "400px",
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Confirm Deletion
            </h3>
            <p style={{ marginBottom: "20px", textAlign: "center" }}>
              Are you sure you want to delete this forum? This action cannot be
              undone.
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(forumToDelete)}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de mise à jour du forum */}
      {showUpdateModal && forumToUpdate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "900px",
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Update Forum
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Title:</label>
              <input
                type="text"
                value={updatedTitle}
                onChange={(e) => setUpdatedTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Description:</label>
              <textarea
                value={updatedDescription}
                onChange={(e) => setUpdatedDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "20px",
                  border: "1px solid #ddd",
                  minHeight: "100px",
                }}
              />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ color: "black" }}>Anonymous:</label>
              <select
                value={updatedAnonymous}
                onChange={(e) => setUpdatedAnonymous(e.target.value === "true")}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                }}
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
              {updatedPhoto && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "10px",
                  }}
                >
                  <img
                    src={URL.createObjectURL(updatedPhoto)}
                    alt="Choisir une image"
                    style={{
                      maxWidth: "200px",
                      maxHeight: "200px",
                      borderRadius: "100px",
                    }}
                  />
                </div>
              )}
            </div>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <button
                onClick={() => setShowUpdateModal(false)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdate(forumToUpdate._id)}
                style={{
                  backgroundColor: "#4CAF50",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de commentaires */}
      {showCommentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              width: "900px",
              maxWidth: "100%",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3 style={{ marginBottom: "20px", textAlign: "center" }}>
              Commentaires
            </h3>

            {/* Affichage des commentaires */}
            <div>
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <div key={index} style={{ marginBottom: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {/* Vérifier si l'utilisateur est anonyme */}
                      <img
                        src={
                          comment.anonymous === true
                            ? "/assets/img/user_icon.png"
                            : `http://localhost:5000/uploads/${comment.user_id.user_photo}`
                        }
                        alt="User Avatar"
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                      <div>
                        {/* Affichage du nom d'utilisateur et spécialité si l'utilisateur n'est pas anonyme */}
                        {comment.anonymous === true ? (
                          <p>Anonymous Member</p>
                        ) : (
                          <>
                            <p>{comment.user_id.username}{" "}
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "transparent",
                                border: "1px solid #00BFFF", // Cadre bleu
                                color: "#00BFFF", // Texte bleu
                                padding: "2px 8px",
                                borderRadius: "20px",
                                boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)", // Lueur bleue
                                fontSize: "0.875rem", // Petit texte
                              }}
                            >
                              {comment.user_id.level}{""}
                              {comment.user_id.speciality}
                            </span></p>
                          </>
                        )}
                      </div>
                    </div>
                    <p>{comment.content}</p>
                  </div>
                ))
              ) : (
                <p>Aucun commentaire disponible.</p>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                onClick={() => setShowCommentModal(false)}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  padding: "10px 20px",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Forum;
