import React, { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode';
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import debounce from 'lodash/debounce';

const AddForum = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [forumPhoto, setForumPhoto] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [anonymous, setAnonymous] = useState('no');
  const [tags, setTags] = useState("");
  const [containsToxicContent, setContainsToxicContent] = useState(false);
  const [toxicWords, setToxicWords] = useState([]);
  const [isToxic, setIsToxic] = useState(false);
  const [titleToxicityScore, setTitleToxicityScore] = useState(0);
  const [descriptionToxicityScore, setDescriptionToxicityScore] = useState(0);

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

  // Liste manuelle de mots et expressions toxiques (en minuscules)
  const toxicWordsList = [
    "idiot", "stupide", "nul", "débile", "crétin", "imbécile",
    "je déteste", "tu es nul", "je vais te", "frapper", "insulter",
    "connard", "salopard", "merde", "putain", "foutre", "enculé",
    "dégage", "ta gueule", "ferme-la", "va te faire"
  ];

  // Fonction pour détecter des motifs toxiques (majuscules, répétitions, etc.)
  const detectToxicPatterns = (text) => {
    let score = 0;

    // 1. Usage excessif de majuscules (signe de "cri")
    const uppercaseWords = text.split(/\s+/).filter(word => word === word.toUpperCase() && word.length > 3);
    if (uppercaseWords.length > 0) {
      score += 0.2 * (uppercaseWords.length / text.split(/\s+/).length);
    }

    // 2. Répétition de caractères (ex. "nullllll", "hahaahahaha")
    const repeatedChars = text.split(/\s+/).filter(word => /(.)\1{3,}/.test(word));
    if (repeatedChars.length > 0) {
      score += 0.15 * (repeatedChars.length / text.split(/\s+/).length);
    }

    // 3. Présence de phrases négatives ou agressives
    const aggressivePhrases = ["je vais te", "tu es", "va te faire"];
    aggressivePhrases.forEach(phrase => {
      if (text.toLowerCase().includes(phrase)) {
        score += 0.3;
      }
    });

    return Math.min(score, 1);
  };

  // Fonction pour calculer un score de toxicité
  const calculateToxicityScore = (text) => {
    if (!text) return 0;

    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    if (words.length === 0) return 0;

    let toxicWordsFound = [];
    let toxicScore = 0;

    // Vérifier chaque mot ou expression toxique
    toxicWordsList.forEach(toxicWord => {
      if (text.toLowerCase().includes(toxicWord)) {
        // Ajouter le mot toxique tel qu'il apparaît dans le texte (pour l'afficher dans le message d'erreur)
        const regex = new RegExp(toxicWord, 'gi'); // 'gi' pour insensible à la casse
        const matches = text.match(regex);
        if (matches) {
          toxicWordsFound.push(...matches);
        }
        toxicScore += 0.2;
      }
    });

    toxicScore += detectToxicPatterns(text);
    const densityFactor = toxicWordsFound.length / words.length;
    toxicScore += densityFactor * 0.3;

    return Math.min(toxicScore, 1);
  };

  // Fonction debounce pour calculer la toxicité en temps réel
  const debouncedCalculateToxicity = debounce((text, type) => {
    const score = calculateToxicityScore(text);

    if (type === "title") {
      setTitleToxicityScore(score);
      setIsToxic(score > 0.5);
    } else if (type === "description") {
      setDescriptionToxicityScore(score);
      setIsToxic(score > 0.5);
    }
  }, 500);

  // Fonction pour vérifier la présence de contenu toxique
  const checkToxicContent = (title, description) => {
    const text = (title || "") + " " + (description || "");
    let toxicWordsFound = [];

    // Vérifier chaque mot ou expression toxique
    toxicWordsList.forEach(toxicWord => {
      const regex = new RegExp(`\\b${toxicWord}\\b`, 'gi'); // 'gi' pour insensible à la casse, \b pour les limites de mots
      const matches = text.match(regex);
      if (matches) {
        toxicWordsFound.push(...matches);
      }
    });

    if (toxicWordsFound.length > 0 || detectToxicPatterns(title) > 0 || detectToxicPatterns(description) > 0) {
      setContainsToxicContent(true);
      setToxicWords(toxicWordsFound);
    } else {
      setContainsToxicContent(false);
      setToxicWords([]);
    }
  };

  const handlePhotoChange = (event) => {
    setForumPhoto(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId || !token) {
      toast.error("Vous devez être connecté pour ajouter un forum.");
      return;
    }

    const titleToxicityScore = calculateToxicityScore(title);
    const descriptionToxicityScore = calculateToxicityScore(description);

    setTitleToxicityScore(titleToxicityScore);
    setDescriptionToxicityScore(descriptionToxicityScore);

    if (titleToxicityScore > 0.5 || descriptionToxicityScore > 0.5) {
      setIsToxic(true);
      return;
    }

    setIsToxic(false);

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
      setContainsToxicContent(false);
      setToxicWords([]);
      setIsToxic(false);
      setTitleToxicityScore(0);
      setDescriptionToxicityScore(0);
      toast.success('Votre sujet a été ajouté avec succès !');
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur lors de l'ajout du sujet.");
    }
  };

  // Fonction pour déterminer le dégradé de couleur en fonction du score
  const getGradientColor = (score) => {
    if (score > 0.5) {
      return "linear-gradient(to right, #ff4d4d, #ff1a1a)"; // Rouge pour toxicité > 50%
    } else if (score > 0.3) {
      return "linear-gradient(to right, #ffa500, #ff7f00)"; // Orange pour toxicité entre 30% et 50%
    } else {
      return "linear-gradient(to right, #28a745, #218838)"; // Vert pour toxicité < 30%
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
                          checkToxicContent(newTitle, description);
                          debouncedCalculateToxicity(newTitle, "title");
                        }}
                        required
                      />
                    </div>
                    <div className="mt-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Toxicity level :{" "}
                        <span
                          style={{
                            color:
                              titleToxicityScore > 0.5
                                ? "#ff4d4d"
                                : titleToxicityScore > 0.3
                                ? "#ffa500"
                                : "#28a745",
                            fontWeight: "bold",
                            backgroundColor: "#f0f0f0",
                            padding: "2px 6px",
                            borderRadius: "12px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                        >
                          {(titleToxicityScore * 100).toFixed(2)}%
                        </span>
                      </label>
                      <div
                        style={{
                          width: "100%",
                          height: "12px",
                          backgroundColor: "#e0e0e0",
                          borderRadius: "20px",
                          overflow: "hidden",
                          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
                          position: "relative",
                          marginTop: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: `${titleToxicityScore * 100}%`,
                            height: "100%",
                            backgroundImage: getGradientColor(titleToxicityScore),
                            borderRadius: "20px",
                            transition: "width 0.5s ease-in-out",
                            position: "relative",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                              animation: "shine 2s infinite",
                            }}
                          />
                        </div>
                      </div>
                      {titleToxicityScore > 0.5 && (
                        <p className="text-red-500 text-xs mt-1">
                          Toxicité trop élevée ! Modifiez votre titre (doit être inférieur à 50%).{" "}
                          {toxicWords.length > 0 && (
                            <span>Mots problématiques : {toxicWords.join(", ")}</span>
                          )}
                        </p>
                      )}
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
                          checkToxicContent(title, newDescription);
                          debouncedCalculateToxicity(newDescription, "description");
                        }}
                        required
                      ></textarea>
                    </div>
                    <div className="mt-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Toxicity level :{" "}
                        <span
                          style={{
                            color:
                              descriptionToxicityScore > 0.5
                                ? "#ff4d4d"
                                : descriptionToxicityScore > 0.3
                                ? "#ffa500"
                                : "#28a745",
                            fontWeight: "bold",
                            backgroundColor: "#f0f0f0",
                            padding: "2px 6px",
                            borderRadius: "12px",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }}
                        >
                          {(descriptionToxicityScore * 100).toFixed(2)}%
                        </span>
                      </label>
                      <div
                        style={{
                          width: "100%",
                          height: "12px",
                          backgroundColor: "#e0e0e0",
                          borderRadius: "20px",
                          overflow: "hidden",
                          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
                          position: "relative",
                          marginTop: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: `${descriptionToxicityScore * 100}%`,
                            height: "100%",
                            backgroundImage: getGradientColor(descriptionToxicityScore),
                            borderRadius: "20px",
                            transition: "width 0.5s ease-in-out",
                            position: "relative",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                              animation: "shine 2s infinite",
                            }}
                          />
                        </div>
                      </div>
                      {descriptionToxicityScore > 0.5 && (
                        <p className="text-red-500 text-xs mt-1">
                          Toxicité trop élevée ! Modifiez votre description (doit être inférieur à 50%).{" "}
                          {toxicWords.length > 0 && (
                            <span>Mots problématiques : {toxicWords.join(", ")}</span>
                          )}
                        </p>
                      )}
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
                      disabled={containsToxicContent || isToxic}
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

      <style>
        {`
          @keyframes shine {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}
      </style>
    </div>
  );
};

export default AddForum;