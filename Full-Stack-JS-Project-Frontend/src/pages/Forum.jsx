import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Forum() {
    const [forums, setForums] = useState([]); // État pour stocker les forums
    const navigate = useNavigate(); // Hook pour la navigation
  
    useEffect(() => {
      // Fonction pour récupérer les forums depuis le backend
      const fetchForums = async () => {
        try {
          const response = await fetch("http://localhost:5000/forum/getForum"); // URL de votre backend
          const data = await response.json();
          setForums(data); // Stocker les forums récupérés dans l'état
        } catch (error) {
          console.error("Erreur lors de la récupération des forums:", error);
        }
      };
  
      fetchForums();
    }, []); // Le tableau vide [] signifie que l'effet s'exécute une seule fois au chargement du composant
  
    return (
      <div>
        <main className="main">
          {/* breadcrumb */}
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
          {/* breadcrumb end */}
          {/* Forum section */}
          <div className="forum-area py-100">
            <div className="container">
              <div className="forum-header d-flex justify-content-between align-items-center mb-4">
                <button
                  className="theme-btn"
                  onClick={() => navigate("/addforum")}
                >
                  Add New Topic
                </button>
                <div className="forum-filters d-flex gap-3">
                  <input
                    type="text"
                    className="form-control rounded-full w-96"
                    placeholder="Search topics..."
                  />
                  <select className="form-select">
                    <option value="latest">Latest</option>
                    <option value="oldest">Oldest</option>
                  </select>
                </div>
              </div>
              <div className="forum-list">
                {/* Affichage des forums récupérés */}
                {forums.length > 0 ? (
                  forums.map((forum) => (
                    <div
                      key={forum._id}
                      className="forum-item p-3 border rounded mb-3"
                    >
                      {/* Titre du forum */}
                      <h5 className="mb-1">
                        <a href="#">{forum.title}</a>
                      </h5>
                      {/* Description du forum */}
                      <p className="mb-0 text-muted">{forum.description}</p>
                      {/* Photo du forum */}
                      {forum.forum_photo && (
                        <img
                          src={forum.forum_photo}
                          alt="Forum"
                          className="forum-photo mt-2"
                          style={{
                            width: "100%",
                            height: "auto",
                            borderRadius: "20px",
                          }}
                        />
                      )}
                      <p className="mb-0 text-muted">
                        Posted by {forum.author} |{" "}
                        {new Date(forum.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>No forums available.</p>
                )}
              </div>
            </div>
          </div>
          {/* Forum section end */}
        </main>
      </div>
    );
  }
  
  export default Forum;