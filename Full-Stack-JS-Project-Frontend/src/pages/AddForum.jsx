import React, { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode'; 

const AddForum = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [forumPhoto, setForumPhoto] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [anonymous, setAnonymous] = useState('no'); // Valeur initiale à 'no'

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

  const handlePhotoChange = (event) => {
    setForumPhoto(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId || !token) {
      alert("Vous devez être connecté pour ajouter un forum.");
      return;
    }

    // Créer le FormData pour envoyer les données avec le fichier
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("anonymous", anonymous); 

    if (forumPhoto) {
        formData.append("forum_photo", forumPhoto);
      }
    try {
      const response = await fetch(`http://localhost:5000/forum/addForum/${userId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'ajout du forum.");
      }

      const data = await response.json();
      console.log("Forum ajouté avec succès:", data);

      // Réinitialiser les champs après succès
      setTitle("");
      setDescription("");
      setAnonymous('no'); // Réinitialiser la valeur de "anonymous"
      setForumPhoto(null);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Une erreur s'est produite lors de l'ajout du forum.");
    }
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
            <h2 className="breadcrumb-title text-white">Ajouter un Forum</h2>
            <ul className="breadcrumb-menu">
              <li>
                <a href="/Home">Home</a>
              </li>
              <li>
                <a href="/forum">Forum</a>
              </li>
              <li className="active">add new topic</li>
            </ul>
          </div>
        </div>

        {/* Formulaire d'ajout de forum */}
        <div className="auth-area py-120">
          <div className="container">
            <div className="col-md-5 mx-auto">
              <div className="auth-form">
                <div className="auth-header text-center">
                  <h2 className="text-2xl font-bold mb-4">Add forum topic</h2>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <div className="form-icon">
                      <i className="far fa-pencil-alt"></i>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Forum title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-icon">
                      <i className="far fa-comment"></i>
                      <textarea
                        className="form-control"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                      ></textarea>
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="form-icon">
                      <i className="far fa-image"></i>
                      <input
                        type="file"
                        onChange={handlePhotoChange}
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="anonymous" className="font-semibold text-lg">
                      Post your topic anonymously:
                    </label>
                    <select
                      id="anonymous"
                      name="anonymous"
                      value={anonymous}
                      onChange={(e) => setAnonymous(e.target.value)}
                      className="form-control"
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  <div className="auth-group text-center">
                    <button
                      type="submit"
                      className="theme-btn w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Add topic
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddForum;
