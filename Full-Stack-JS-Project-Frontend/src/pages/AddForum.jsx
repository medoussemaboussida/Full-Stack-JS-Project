import React, { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode';
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import debounce from 'lodash/debounce';
import { Filter } from 'bad-words';

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
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [tagsError, setTagsError] = useState("");

  const badWordsFilter = new Filter();

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

  const toxicWordsList = [
    "idiot", "stupide", "nul", "débile", "crétin", "imbécile",
    "je déteste", "tu es nul", "je vais te", "frapper", "insulter",
    "connard", "salopard", "merde", "putain", "foutre", "enculé",
    "dégage", "ta gueule", "ferme-la", "va te faire"
  ];

  const detectToxicPatterns = (text) => {
    let score = 0;
    const uppercaseWords = text.split(/\s+/).filter(word => word === word.toUpperCase() && word.length > 3);
    if (uppercaseWords.length > 0) {
      score += 0.2 * (uppercaseWords.length / text.split(/\s+/).length);
    }
    const repeatedChars = text.split(/\s+/).filter(word => /(.)\1{3,}/.test(word));
    if (repeatedChars.length > 0) {
      score += 0.15 * (repeatedChars.length / text.split(/\s+/).length);
    }
    const aggressivePhrases = ["je vais te", "tu es", "va te faire"];
    aggressivePhrases.forEach(phrase => {
      if (text.toLowerCase().includes(phrase)) score += 0.3;
    });
    return Math.min(score, 1);
  };

  const calculateToxicityScore = (text) => {
    if (!text) return 0;
    const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    if (words.length === 0) return 0;

    let toxicWordsFound = [];
    let toxicScore = 0;

    toxicWordsList.forEach(toxicWord => {
      if (text.toLowerCase().includes(toxicWord)) {
        const regex = new RegExp(toxicWord, 'gi');
        const matches = text.match(regex);
        if (matches) toxicWordsFound.push(...matches);
        toxicScore += 0.2;
      }
    });

    toxicScore += detectToxicPatterns(text);
    const densityFactor = toxicWordsFound.length / words.length;
    toxicScore += densityFactor * 0.3;

    return Math.min(toxicScore, 1);
  };

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

  const checkToxicContent = (title, description) => {
    const text = (title || "") + " " + (description || "");
    let toxicWordsFound = [];

    toxicWordsList.forEach(toxicWord => {
      const regex = new RegExp(`\\b${toxicWord}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) toxicWordsFound.push(...matches);
    });

    if (toxicWordsFound.length > 0 || detectToxicPatterns(title) > 0 || detectToxicPatterns(description) > 0) {
      setContainsToxicContent(true);
      setToxicWords(toxicWordsFound);
    } else {
      setContainsToxicContent(false);
      setToxicWords([]);
    }
  };

  const checkBadWords = debounce((text, field) => {
    const words = text.split(/\s+/);
    const foundBadWords = words.filter(word => badWordsFilter.isProfane(word));
    if (foundBadWords.length > 0) {
      toast.error(`Inappropriate content detected in ${field}: ${foundBadWords.join(", ")}. Please revise your text.`, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  }, 500);

  const validateForm = (field, value) => {
    const titleRegex = /^[A-Za-z0-9\s.,!?]+$/;
    const tagsAllowed = ["anxiety", "stress", "depression", "burnout", "studies", "loneliness", "motivation", "support", "insomnia", "pressure"];
    let error = "";

    if (field === "title" || field === "all") {
      if (!value) {
        error = "Title is required.";
      } else if (value.length < 5) {
        error = "Title must be at least 5 characters long.";
      } else if (value.length > 100) {
        error = "Title cannot exceed 100 characters.";
      } else if (!titleRegex.test(value)) {
        error = "Title can only contain letters, numbers, spaces, and some characters (.,!?).";
      }
      setTitleError(error);
      if (error) return false;
    }

    if (field === "description" || field === "all") {
      if (!value) {
        error = "Description is required.";
      } else if (value.length < 10) {
        error = "Description must be at least 10 characters long.";
      } else if (value.length > 1000) {
        error = "Description cannot exceed 1000 characters.";
      } else if (!titleRegex.test(value)) {
        error = "Description can only contain letters, numbers, spaces, and some characters (.,!?).";
      }
      setDescriptionError(error);
      if (error) return false;
    }

    if (field === "tags" || field === "all") {
      if (value && !tagsAllowed.includes(value)) {
        error = "Invalid tag. Choose from the allowed tags.";
      }
      setTagsError(error);
      if (error) return false;
    }

    return true;
  };

  const handlePhotoChange = (event) => {
    setForumPhoto(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId || !token) {
      toast.error("You must be logged in to add a forum.");
      return;
    }

    const isTitleValid = validateForm("title", title);
    const isDescriptionValid = validateForm("description", description);
    const isTagsValid = validateForm("tags", tags);

    if (!isTitleValid || !isDescriptionValid || !isTagsValid) {
      return;
    }

    const titleToxicityScore = calculateToxicityScore(title);
    const descriptionToxicityScore = calculateToxicityScore(description);

    setTitleToxicityScore(titleToxicityScore);
    setDescriptionToxicityScore(descriptionToxicityScore);

    if (titleToxicityScore > 0.5 || descriptionToxicityScore > 0.5) {
      setIsToxic(true);
      toast.error("Toxicity level too high! Please revise your content (must be below 50%).", {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    setIsToxic(false);

    const titleHasBadWords = badWordsFilter.isProfane(title);
    const descriptionHasBadWords = badWordsFilter.isProfane(description);

    if (titleHasBadWords || descriptionHasBadWords) {
      const foundBadWords = [
        ...title.split(/\s+/).filter(word => badWordsFilter.isProfane(word)),
        ...description.split(/\s+/).filter(word => badWordsFilter.isProfane(word))
      ];
      toast.error(`Inappropriate content detected: ${foundBadWords.join(", ")}. Cannot post.`, {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("anonymous", anonymous);
    // Envoyer les tags comme un tableau en utilisant la notation tags[]
    const tagsArray = tags ? [tags] : [];
    tagsArray.forEach(tag => formData.append("tags[]", tag));
    if (forumPhoto) formData.append("forum_photo", forumPhoto);

    try {
      const response = await fetch(`http://localhost:5000/forum/addForum/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors ? errorData.errors.join(", ") : "Error adding forum.");
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
      setTitleError("");
      setDescriptionError("");
      setTagsError("");
      toast.success('Your topic has been successfully added!');
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error.message || "Error adding the topic.");
    }
  };

  const getGradientColor = (score) => {
    if (score > 0.5) return "linear-gradient(to right, #ff4d4d, #ff1a1a)";
    else if (score > 0.3) return "linear-gradient(to right, #ffa500, #ff7f00)";
    else return "linear-gradient(to right, #28a745, #218838)";
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
        <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
          <div className="container">
            <h2 className="breadcrumb-title text-white">Add a Forum</h2>
            <ul className="breadcrumb-menu">
              <li><a href="/Home">Home</a></li>
              <li><a href="/forum">Forum</a></li>
              <li className="active">Add new topic</li>
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
                          checkBadWords(newTitle, "title");
                          validateForm("title", newTitle);
                        }}
                        required
                      />
                    </div>
                    {titleError && (
                      <p className="text-red-500 text-xs mt-1">{titleError}</p>
                    )}
                    <div className="mt-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Toxicity level:{" "}
                        <span style={{
                          color: titleToxicityScore > 0.5 ? "#ff4d4d" : titleToxicityScore > 0.3 ? "#ffa500" : "#28a745",
                          fontWeight: "bold",
                          backgroundColor: "#f0f0f0",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}>
                          {(titleToxicityScore * 100).toFixed(2)}%
                        </span>
                      </label>
                      <div style={{
                        width: "100%",
                        height: "12px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "20px",
                        overflow: "hidden",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
                        position: "relative",
                        marginTop: "4px",
                      }}>
                        <div style={{
                          width: `${titleToxicityScore * 100}%`,
                          height: "100%",
                          backgroundImage: getGradientColor(titleToxicityScore),
                          borderRadius: "20px",
                          transition: "width 0.5s ease-in-out",
                          position: "relative",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}>
                          <div style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                            animation: "shine 2s infinite",
                          }} />
                        </div>
                      </div>
                      {titleToxicityScore > 0.5 && (
                        <p className="text-red-500 text-xs mt-1">
                          Toxicity too high! Please revise your title (must be below 50%).{" "}
                          {toxicWords.length > 0 && (
                            <span>Problematic words: {toxicWords.join(", ")}</span>
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
                          checkBadWords(newDescription, "description");
                          validateForm("description", newDescription);
                        }}
                        required
                      ></textarea>
                    </div>
                    {descriptionError && (
                      <p className="text-red-500 text-xs mt-1">{descriptionError}</p>
                    )}
                    <div className="mt-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Toxicity level:{" "}
                        <span style={{
                          color: descriptionToxicityScore > 0.5 ? "#ff4d4d" : descriptionToxicityScore > 0.3 ? "#ffa500" : "#28a745",
                          fontWeight: "bold",
                          backgroundColor: "#f0f0f0",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}>
                          {(descriptionToxicityScore * 100).toFixed(2)}%
                        </span>
                      </label>
                      <div style={{
                        width: "100%",
                        height: "12px",
                        backgroundColor: "#e0e0e0",
                        borderRadius: "20px",
                        overflow: "hidden",
                        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
                        position: "relative",
                        marginTop: "4px",
                      }}>
                        <div style={{
                          width: `${descriptionToxicityScore * 100}%`,
                          height: "100%",
                          backgroundImage: getGradientColor(descriptionToxicityScore),
                          borderRadius: "20px",
                          transition: "width 0.5s ease-in-out",
                          position: "relative",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}>
                          <div style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                            animation: "shine 2s infinite",
                          }} />
                        </div>
                      </div>
                      {descriptionToxicityScore > 0.5 && (
                        <p className="text-red-500 text-xs mt-1">
                          Toxicity too high! Please revise your description (must be below 50%).{" "}
                          {toxicWords.length > 0 && (
                            <span>Problematic words: {toxicWords.join(", ")}</span>
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
                      onChange={(e) => {
                        const newTag = e.target.value;
                        setTags(newTag);
                        validateForm("tags", newTag);
                      }}
                      className="form-control"
                    >
                      <option value="">Select a tag</option>
                      {tagOptions.map((tagOption) => (
                        <option key={tagOption} value={tagOption}>
                          {tagOption}
                        </option>
                      ))}
                    </select>
                    {tagsError && (
                      <p className="text-red-500 text-xs mt-1">{tagsError}</p>
                    )}
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
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default AddForum;