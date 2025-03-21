import React, { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode'; 
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import { Filter } from 'bad-words'; // Importation corrigée

const AddForum = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [forumPhoto, setForumPhoto] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [anonymous, setAnonymous] = useState('no');
  const [tags, setTags] = useState("");
  const [containsBadWords, setContainsBadWords] = useState(false);
  const [badWords, setBadWords] = useState([]);
  const [showToast, setShowToast] = useState(false); // État pour gérer les notifications uniques

  // Initialiser le filtre bad-words
  const filter = new Filter();

  // Liste des tags prédéfinis
  const tagOptions = [
    "anxiety", "stress", "depression", "burnout", "studies",
    "loneliness", "motivation", "support", "insomnia", "pressure"
  ];

  useEffect(() => {
    const token = localStorage.getItem("jwt-token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          console.log("Token expiré.");
          localStorage.removeItem("jwt-token");
          return;
        }

        setToken(token);
        setUserId(decoded.id);
      } catch (error) {
        console.error("Erreur de décodage du token:", error);
        localStorage.removeItem("jwt-token");
      }
    } else {
      console.log("Aucun token trouvé.");
    }
  }, []);

  const checkBadWords = (title, description) => {
    const titleCleaned = filter.clean(title || "");
    const descriptionCleaned = filter.clean(description || "");

    const hasBadWordsInTitle = titleCleaned !== (title || "");
    const hasBadWordsInDescription = descriptionCleaned !== (description || "");

    if (hasBadWordsInTitle || hasBadWordsInDescription) {
      const words = (title || "").split(/\s+/).concat((description || "").split(/\s+/));
      const badWordsList = words.filter(word => filter.isProfane(word));

      setContainsBadWords(true);
      setBadWords(badWordsList);

      if (!showToast) {
        toast.error(`Inappropriate words detected: ${badWordsList.join(", ")}`, {
          onClose: () => setShowToast(false),
        });
        setShowToast(true);
      }
    } else {
      setContainsBadWords(false);
      setBadWords([]);
      setShowToast(false);
    }
  };

  const handlePhotoChange = (event) => {
    setForumPhoto(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId || !token) {
      alert("Vous devez être connecté pour ajouter un forum.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("anonymous", anonymous);
    formData.append("tags", JSON.stringify(tags ? [tags] : []));
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
      setTitle("");
      setDescription("");
      setAnonymous('no');
      setForumPhoto(null);
      setTags("");
      setContainsBadWords(false);
      setBadWords([]);
      setShowToast(false);
      toast.success('Your topic is added successfully!');
    } catch (error) {
      console.error("Erreur:", error);
    }
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
                        onChange={(e) => {
                          const newTitle = e.target.value;
                          setTitle(newTitle);
                          checkBadWords(newTitle, description);
                        }}
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
                        onChange={(e) => {
                          const newDescription = e.target.value;
                          setDescription(newDescription);
                          checkBadWords(title, newDescription);
                        }}
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

                  <div className="form-group">
                    <label htmlFor="tag" className="font-semibold text-lg">
                      Tag:
                    </label>
                    <select
                      id="tag"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="form-control"
                    >
                      <option value="">Select a tag</option>
                      {tagOptions.map((tagOption) => (
                        <option key={tagOption} value={tagOption}>
                          {tagOption}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="auth-group text-center">
                    <button
                      type="submit"
                      className="theme-btn w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={containsBadWords}
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