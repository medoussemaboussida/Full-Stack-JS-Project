import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faTrashAlt,
  faPaperPlane,
  faEye,
} from "@fortawesome/free-regular-svg-icons";
import { faSearch } from "@fortawesome/free-solid-svg-icons"; // Ajout de l'icône faSearch
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";

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
  const [comment, setComment] = useState({}); // État pour le commentaire
  const [expanded, setExpanded] = useState({}); // Suivi de l'état d'expansion de chaque forum
  const [anonymous, setAnonymous] = useState(false);
  const [comments, setComments] = useState([]); // Pour stocker les commentaires
  const [showCommentModal, setShowCommentModal] = useState(false); // Pour contrôler l'affichage du modal des commentaires
  const [forumIdForComments, setForumIdForComments] = useState(null); // Pour stocker l'ID du forum actuel
  const [commentToDelete, setCommentToDelete] = useState(null); // Commentaire à supprimer
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false); // Afficher/masquer le modal de suppression de commentaire
  const [updatedTag, setUpdatedTag] = useState(""); // Nouvel état pour le tag
  const [searchQuery, setSearchQuery] = useState(""); // État pour la valeur de recherche
  const [isSearchOpen, setIsSearchOpen] = useState(false); // État pour contrôler l'affichage du champ de recherche
  const [sortOption, setSortOption] = useState("newest"); // État pour l'option de tri
  const navigate = useNavigate();

  // Fonction pour basculer l'état d'expansion
  const toggleDescription = (forumId) => {
    setExpanded((prev) => ({
      ...prev,
      [forumId]: !prev[forumId], // Inverse l'état d'expansion pour ce forum
    }));
  };
  // Fonction pour basculer l'affichage du champ de recherche
  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) {
      setSearchQuery(""); // Réinitialiser la recherche quand le champ disparaît
    }
  };
  const filteredForums = forums
    .filter((forum) => {
      if (!searchQuery) return true; // Si pas de recherche, afficher tous les forums
      const query = searchQuery.toLowerCase();
      const titleMatch = forum.title.toLowerCase().includes(query);
      const descriptionMatch = forum.description.toLowerCase().includes(query);
      const tagsMatch =
        forum.tags &&
        forum.tags.some((tag) => tag.toLowerCase().includes(query));
      return titleMatch || descriptionMatch || tagsMatch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return sortOption === "newest" ? dateB - dateA : dateA - dateB; // Tri par date
    });
  // Liste des tags prédéfinis
  const tagOptions = [
    "anxiety",
    "stress",
    "depression",
    "burnout",
    "studies",
    "loneliness",
    "motivation",
    "support",
    "insomnia",
    "pressure",
  ];
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
        toast.success("Your Comment is added successfully!");
        setComments((prev) => ({
          ...prev,
          [forumId]: "", // Réinitialiser uniquement cet input
        }));
      } else {
        console.error("Error adding comment:", data.message || data);
        toast.error("Failed to add your comment");
      }
    } catch (error) {
      console.error("Error in API call:", error);
    }
  };

  // Suppression d'un commentaire
  const handleDeleteComment = (commentId) => {
    fetch(`http://localhost:5000/forumComment/deleteComment/${commentId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Commentaire supprimé:", data);
        setComments(comments.filter((comment) => comment._id !== commentId)); // Supprimer localement
        setShowDeleteCommentModal(false); // Fermer le modal
        toast.success("Your comment was deleted successfully!");
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression du commentaire:", error);
        toast.error("Failed to delete your comment!");
      });
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
        toast.success("Your topic was deleted successfully !");
      })
      .catch((error) => {
        console.error("Erreur lors de la suppression du forum:", error);
        toast.error("Failed to delete your topic !");
      });
  };

  //update forum
  const handleUpdate = (forumId) => {
    const formData = new FormData();
    formData.append("title", updatedTitle);
    formData.append("description", updatedDescription);
    formData.append("anonymous", updatedAnonymous);
    formData.append("tags", JSON.stringify(updatedTag ? [updatedTag] : [])); // Ajouter les tags
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
                  tags: updatedTag ? [updatedTag] : [], // Mettre à jour les tags localement
                }
              : forum
          )
        );
        setShowUpdateModal(false); // Fermer le modal de mise à jour
        toast.success("Your topic is updated successfully!");
      })
      .catch((error) => {
        console.error("Erreur lors de la mise à jour du forum:", error);
        toast.error("Failed to update your topic !");
      });
  };

  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
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
          <div
            className="container"
            style={{ maxWidth: "800px", margin: "0 auto" }}
          >
            <div className="forum-header d-flex justify-content-between align-items-center mb-4">
              {/* Champ de recherche à gauche avec icône et animation */}
              <div
                style={{
                  position: "relative",
                  width: isSearchOpen ? "400px" : "40px",
                  transition: "width 0.3s ease",
                }}
              >
                {!isSearchOpen ? (
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={{
                      fontSize: "20px",
                      color: "#007bff",
                      cursor: "pointer",
                    }}
                    onClick={toggleSearch}
                  />
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={faSearch}
                      style={{
                        position: "absolute",
                        left: "15px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#007bff",
                        fontSize: "18px",
                        cursor: "pointer",
                      }}
                      onClick={toggleSearch}
                    />
                    <input
                      type="text"
                      placeholder=" Search any topic..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        padding: "8px 8px 8px 40px",
                        borderRadius: "50px",
                        border: "1px solid #007bff",
                        outline: "none",
                        width: isSearchOpen ? "100%" : "0%", // Animation de la largeur
                        boxSizing: "border-box",
                        opacity: isSearchOpen ? 1 : 0, // Animation de l'opacité
                        transition: "opacity 0.10s ease, width 0.10s ease", // Transition pour l'apparition et la disparition
                        visibility: isSearchOpen ? "visible" : "hidden", // S'assurer que l'input est complètement caché
                      }}
                    />
                  </>
                )}
              </div>
              {/* Conteneur pour la liste déroulante et le bouton */}
              <div className="d-flex align-items-center">
                {/* Liste déroulante à gauche */}
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  style={{
                    padding: "10px",
                    borderRadius: "50px",
                    border: "1px solid #007bff",
                    outline: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    marginRight: "10px",
                    width: "200px", // Augmentation de la largeur
                    
                  }}
                >
                  <option value="newest">Newest Topics</option>
                  <option value="oldest">Oldest Topics</option>
                </select>

                {/* Bouton Add New Topic */}
                <button
                  className="theme-btn"
                  style={{
                    borderRadius: "50px",
                  }}
                  onClick={() => navigate("/addforum")}
                >
                  New Topic
                </button>
              </div>
            </div>

            <div
              className="forum-list"
              style={{
                maxWidth: "800px", // Réduit la largeur
                margin: "0 auto", // Centre la section
                width: "100%", // Responsive
              }}
            >
              {filteredForums.length > 0 ? (
                filteredForums.map((forum) => (
                  <div
                    key={forum._id}
                    className="forum-item p-4 border rounded mb-4"
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center">
                        <img
                          src={
                            forum.anonymous
                              ? "assets/img/anonymous_member.png"
                              : `http://localhost:5000${forum.user_id.user_photo}`
                          }
                          alt="User"
                          className="rounded-circle me-2"
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover", // Cela garantit que l'image est redimensionnée pour garder un bon aspect circulaire
                          }}
                        />
                        <h6 className="mb-0 me-3">
                          {forum.anonymous
                            ? "Anonymous member"
                            : forum.user_id.username || "Utilisateur inconnu"}
                        </h6>
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
                          )}{" "}
                        &nbsp;&nbsp;
                        {/* Badge pour les tags (affiché dans tous les cas) */}
                        {forum.tags && forum.tags.length > 0 && (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: "transparent",
                              border: "1px solid #FF0000", // Cadre rouge
                              color: "#FF0000", // Texte rouge
                              padding: "2px 8px",
                              borderRadius: "20px",
                              boxShadow: "0 0 10px rgba(255, 0, 0, 0.5)", // Lueur rouge
                              fontSize: "0.875rem",
                            }}
                          >
                            {forum.tags.join(", ")}{" "}
                            {/* Affiche les tags séparés par une virgule */}
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
                                setUpdatedTag(forum.tags && forum.tags.length > 0 ? forum.tags[0] : "");
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
                    <h3
                      style={{
                        wordBreak: "break-word", // Coupe les mots trop longs si nécessaire
                        overflowWrap: "break-word", // Assure le retour à la ligne pour les mots longs
                        whiteSpace: "normal", // Permet le retour à la ligne naturel
                        maxWidth: "100%", // Limite à la largeur du conteneur parent
                        margin: 0, // Assure qu'il n'y a pas de marge supplémentaire qui interfère
                      }}
                    >
                      {forum.title}
                    </h3>
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
                          objectFit: "cover",
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
                        value={comments[forum._id] || ""} // Valeur spécifique à ce forum
                        onChange={(e) =>
                          setComments((prev) => ({
                            ...prev,
                            [forum._id]: e.target.value, // Mise à jour pour ce forum uniquement
                          }))
                        }
                      />

                      {/* Bouton d'envoi avec icône */}
                      <button
                        onClick={() =>
                          handleAddComment(
                            forum._id,
                            comments[forum._id] || "",
                            anonymous
                          )
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
                          style={{ fontSize: "14px" }}
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
                          style={{ fontSize: "14px" }}
                        />
                      </button>
                    </div>
                    {/* Checkbox pour commenter en anonyme */}
                    <div className="mt-2 d-flex align-items-center">
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%", // Forme circulaire
                          border: "1px solid black", // Bordure noire
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          marginRight: "10px",
                          transition: "background-color 0.3s ease", // Animation fluide
                          backgroundColor: anonymous
                            ? "rgba(0, 128, 0, 0.2)"
                            : "white", // Léger vert en fond lorsqu'activé
                        }}
                        onClick={() => setAnonymous(!anonymous)} // Toggle lors du clic
                      >
                        <div
                          style={{
                            width: anonymous ? "10px" : "0px", // Taille animée
                            height: anonymous ? "10px" : "0px",
                            backgroundColor: "green",
                            borderRadius: "50%",
                            transition: "all 0.3s ease", // Effet fluide pour l'apparition/disparition
                            opacity: anonymous ? 1 : 0, // Animation d'opacité
                          }}
                        />
                      </div>
                      <label
                        htmlFor="anonymousComment"
                        style={{
                          fontSize: "14px",
                          color: "black",
                          cursor: "pointer",
                        }}
                        onClick={() => setAnonymous(!anonymous)} // Clique aussi sur le texte
                      >
                        Anonymous comment ?
                      </label>
                    </div>
                    {/* Affichage des dates createdAt et updatedAt */}
                    <div
                      className="mt-3 text-muted"
                      style={{ fontSize: "14px" }}
                    >
                      <p style={{ margin: 0 }}>
                        Posted at :{" "}
                        {new Date(forum.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p>There is any topic here !</p>
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
              <label style={{ color: "black" }}>Tag:</label>
              <select
                value={updatedTag}
                onChange={(e) => setUpdatedTag(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "50px",
                  border: "1px solid #ddd",
                }}
              >
                <option value="">Select a tag</option>
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
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
              Comments
            </h3>

            {/* Affichage des commentaires */}
            <div
              style={{
                maxHeight: comments.length > 3 ? "300px" : "auto",
                overflowY: comments.length > 3 ? "auto" : "visible",
                marginBottom: "20px",
              }}
            >
              {comments.length > 0 ? (
                comments.map((comment, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px",
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    {/* Partie gauche : Avatar + Nom + Contenu */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      {/* Avatar */}
                      <img
                        src={
                          comment.anonymous
                            ? "/assets/img/anonymous_member.png"
                            : `http://localhost:5000${comment.user_id.user_photo}`
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
                        {/* Nom ou "Anonymous Member" */}
                        {comment.anonymous ? (
                          <p style={{ margin: 0 }}>Anonymous Member</p>
                        ) : (
                          <p style={{ margin: 0 }}>
                            {comment.user_id.username}{" "}
                            <span
                              className="badge"
                              style={{
                                backgroundColor: "transparent",
                                border: "1px solid #00BFFF",
                                color: "#00BFFF",
                                padding: "2px 8px",
                                borderRadius: "20px",
                                boxShadow: "0 0 10px rgba(0, 191, 255, 0.5)",
                                fontSize: "0.875rem",
                              }}
                            >
                              {comment.user_id.level}{" "}
                              {comment.user_id.speciality}
                            </span>
                          </p>
                        )}
                        {/* Contenu du commentaire avec retour à la ligne */}
                        <p
                          style={{
                            margin: 0,
                            wordBreak: "break-word", // Coupe les mots trop longs si nécessaire
                            overflowWrap: "break-word", // Assure le retour à la ligne pour les mots longs
                            whiteSpace: "normal", // Permet le retour à la ligne naturel
                            maxWidth: "700px", // Limite la largeur pour éviter le débordement
                          }}
                        >
                          {comment.content}
                        </p>
                      </div>
                    </div>

                    {/* Icône de suppression alignée à droite */}
                    {userId === comment.user_id._id && (
                      <span
                        className="icon"
                        style={{
                          cursor: "pointer",
                          fontSize: "18px",
                          color: "red",
                        }}
                        onClick={() => {
                          setCommentToDelete(comment._id);
                          setShowDeleteCommentModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center" }}>There is no comment here!</p>
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
      {/* Modal de confirmation de suppression de commentaire */}
      {showDeleteCommentModal && (
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
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </p>
            <div
              style={{ display: "flex", justifyContent: "center", gap: "10px" }}
            >
              <button
                onClick={() => setShowDeleteCommentModal(false)}
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
                onClick={() => handleDeleteComment(commentToDelete)}
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
    </div>
  );
}

export default Forum;
