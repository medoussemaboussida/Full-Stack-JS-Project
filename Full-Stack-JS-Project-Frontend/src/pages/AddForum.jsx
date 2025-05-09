import React, { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import debounce from "lodash/debounce";
import { Filter } from "bad-words";
import { Navigate } from "react-router-dom";
import { useNavigate } from "react-router-dom"; // Ajout de useNavigate
const AddForum = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [forumPhoto, setForumPhoto] = useState(null);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [anonymous, setAnonymous] = useState("no");
  const [tags, setTags] = useState("");
  const [containsToxicContent, setContainsToxicContent] = useState(false);
  const [toxicWords, setToxicWords] = useState([]);
  const [isToxic, setIsToxic] = useState(false);
  const [titleToxicityScore, setTitleToxicityScore] = useState(0);
  const [descriptionToxicityScore, setDescriptionToxicityScore] = useState(0);
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [tagsError, setTagsError] = useState("");
  const [showChatbotModal, setShowChatbotModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [userMessage, setUserMessage] = useState("");
  const badWordsFilter = new Filter();
  const navigate = useNavigate(); // Ajout au début du composant
  // Fonction pour nettoyer le texte en supprimant les * *
  const cleanText = (text) => {
    return text ? text.replace(/\*\*/g, "") : text;
  };
  const interactWithGemini = async (message) => {
    const GEMINI_API_KEY = "AIzaSyCfw_jacNIo7ORhBYWXr9b6uYDeeOc4C7o";

    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" +
          GEMINI_API_KEY,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: message,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        console.error("Erreur HTTP:", response.status, response.statusText);
        const errorData = await response.json();
        console.error("Détails de l'erreur:", errorData);
        return "Sorry, I couldn't process your request.";
      }

      const data = await response.json();
      const reply = data.candidates[0].content.parts[0].text;
      return reply;
    } catch (error) {
      console.error("Erreur lors de l'interaction avec Gemini:", error);
      return "An error occurred while interacting with the chatbot.";
    }
  };

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(chatMessages));
  }, [chatMessages]);

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
    "idiot",
    "stupide",
    "nul",
    "débile",
    "crétin",
    "imbécile",
    "je déteste",
    "tu es nul",
    "je vais te",
    "frapper",
    "insulter",
    "connard",
    "salopard",
    "merde",
    "putain",
    "foutre",
    "enculé",
    "dégage",
    "ta gueule",
    "ferme-la",
    "va te faire",
    "hate",
    "stupid",
    "idiot",
    "dumb",
    "loser",
    "useless",
    "worthless",
    "moron",
    "bitch",
    "bastard",
    "asshole",
    "retard",
    "psycho",
    "fat",
    "ugly",
    "kill",
    "die",
    "shut up",
    "garbage",
    "freak",
  ];

  const detectToxicPatterns = (text) => {
    let score = 0;
    const uppercaseWords = text
      .split(/\s+/)
      .filter((word) => word === word.toUpperCase() && word.length > 3);
    if (uppercaseWords.length > 0) {
      score += 0.2 * (uppercaseWords.length / text.split(/\s+/).length);
    }
    const repeatedChars = text
      .split(/\s+/)
      .filter((word) => /(.)\1{3,}/.test(word));
    if (repeatedChars.length > 0) {
      score += 0.15 * (repeatedChars.length / text.split(/\s+/).length);
    }
    const aggressivePhrases = ["je vais te", "tu es", "va te faire"];
    aggressivePhrases.forEach((phrase) => {
      if (text.toLowerCase().includes(phrase)) score += 0.3;
    });
    return Math.min(score, 1);
  };

  const calculateToxicityScore = (text) => {
    if (!text) return 0;
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    if (words.length === 0) return 0;

    let toxicWordsFound = [];
    let toxicScore = 0;

    toxicWordsList.forEach((toxicWord) => {
      if (text.toLowerCase().includes(toxicWord)) {
        const regex = new RegExp(toxicWord, "gi");
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

    toxicWordsList.forEach((toxicWord) => {
      const regex = new RegExp(`\\b${toxicWord}\\b`, "gi");
      const matches = text.match(regex);
      if (matches) toxicWordsFound.push(...matches);
    });

    if (
      toxicWordsFound.length > 0 ||
      detectToxicPatterns(title) > 0 ||
      detectToxicPatterns(description) > 0
    ) {
      setContainsToxicContent(true);
      setToxicWords(toxicWordsFound);
    } else {
      setContainsToxicContent(false);
      setToxicWords([]);
    }
  };

  const checkBadWords = debounce((text, field) => {
    const words = text.split(/\s+/);
    const foundBadWords = words.filter((word) =>
      badWordsFilter.isProfane(word)
    );
    if (foundBadWords.length > 0) {
      toast.error(
        `Inappropriate content detected in ${field}: ${foundBadWords.join(
          ", "
        )}. Please revise your text.`,
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
    }
  }, 500);

  const validateForm = (field, value) => {
    const titleRegex = /^[A-Za-z0-9\s.,!?']+$/;
    const tagsAllowed = [
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
    let error = "";

    if (field === "title" || field === "all") {
      if (!value) {
        error = "Title is required.";
      } else if (value.length < 5) {
        error = "Title must be at least 5 characters long.";
      } else if (value.length > 100) {
        error = "Title cannot exceed 100 characters.";
      } else if (!titleRegex.test(value)) {
        error =
          "Title can only contain letters, numbers, spaces, and some characters (.,!?).";
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
        error =
          "Description can only contain letters, numbers, spaces, and some characters (.,!?).";
      }
      setDescriptionError(error);
      if (error) return false;
    }

    if (field === "tags" || field === "all") {
      if (!value) {
        error = "Please select a tag.";
      } else if (!tagsAllowed.includes(value)) {
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
      if (!tags) {
        toast.error("Please select a tag before submitting.", {
          position: "top-right",
          autoClose: 5000,
        });
      }
      return;
    }

    const titleToxicityScore = calculateToxicityScore(title);
    const descriptionToxicityScore = calculateToxicityScore(description);

    setTitleToxicityScore(titleToxicityScore);
    setDescriptionToxicityScore(descriptionToxicityScore);

    if (titleToxicityScore > 0.5 || descriptionToxicityScore > 0.5) {
      setIsToxic(true);
      toast.error(
        "Cannot add topic: Toxicity level is high (must be below 50%).",
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
      return;
    }

    setIsToxic(false);

    const titleHasBadWords = badWordsFilter.isProfane(title);
    const descriptionHasBadWords = badWordsFilter.isProfane(description);

    if (titleHasBadWords || descriptionHasBadWords) {
      const foundBadWords = [
        ...title.split(/\s+/).filter((word) => badWordsFilter.isProfane(word)),
        ...description
          .split(/\s+/)
          .filter((word) => badWordsFilter.isProfane(word)),
      ];
      toast.error(
        `Inappropriate content detected: ${foundBadWords.join(
          ", "
        )}. Cannot post.`,
        {
          position: "top-right",
          autoClose: 5000,
        }
      );
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("anonymous", anonymous);
    const tagsArray = tags ? [tags] : [];
    tagsArray.forEach((tag) => formData.append("tags[]", tag));
    if (forumPhoto) formData.append("forum_photo", forumPhoto);

    try {
      const response = await fetch(
        `http://localhost:5000/forum/addForum/${userId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.errors ? errorData.errors.join(", ") : "Error adding forum."
        );
      }

      const data = await response.json();
      console.log("Forum ajouté avec succès:", data);
      setTitle("");
      setDescription("");
      setAnonymous("no");
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
      toast.success("Your topic has been successfully added!");
      navigate("/forum"); // Redirection vers /forum
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
        <div
          className="site-breadcrumb"
          style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}
        >
          <div className="container">
            <h2 className="breadcrumb-title text-white">Add a Forum</h2>
            <ul className="breadcrumb-menu">
              <li>
                <a href="/Home">Home</a>
              </li>
              <li>
                <a href="/forum">Forum</a>
              </li>
              <li className="active">Add new topic</li>
            </ul>
          </div>
        </div>
        <div
          style={{
            position: "fixed",
            bottom: "18px",
            right: "90px",
            zIndex: 1000,
            cursor: "pointer",
          }}
          onClick={() => setShowChatbotModal(true)}
        >
          <div
            style={{
              backgroundColor: "#28a745",
              borderRadius: "50%",
              width: "60px",
              height: "60px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              transition: "transform 0.3s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "scale(1.1)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ fontSize: "24px", color: "white" }}>🤖</span>
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
                        style={{ borderRadius: "50px" }}
                      />
                    </div>
                    {titleError && (
                      <p
                        style={{
                          color: "#ff0000",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        {titleError}
                      </p>
                    )}
                    <div className="mt-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Toxicity level:{" "}
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
                            borderRadius: "50px",
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
                          boxShadow:
                            "inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
                          position: "relative",
                          marginTop: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: `${titleToxicityScore * 100}%`,
                            height: "100%",
                            backgroundImage:
                              getGradientColor(titleToxicityScore),
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
                              background:
                                "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                              animation: "shine 2s infinite",
                            }}
                          />
                        </div>
                      </div>
                      {titleToxicityScore > 0.5 && (
                        <p
                          style={{
                            color: "#ff0000",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          Toxicity too high! Please revise your title (must be
                          below 50%).{" "}
                          {toxicWords.length > 0 && (
                            <span>
                              Problematic words: {toxicWords.join(", ")}
                            </span>
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
                          debouncedCalculateToxicity(
                            newDescription,
                            "description"
                          );
                          checkBadWords(newDescription, "description");
                          validateForm("description", newDescription);
                        }}
                        required
                      ></textarea>
                    </div>
                    {descriptionError && (
                      <p
                        style={{
                          color: "#ff0000",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        {descriptionError}
                      </p>
                    )}
                    <div className="mt-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Toxicity level:{" "}
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
                          borderRadius: "50px",
                          overflow: "hidden",
                          boxShadow:
                            "inset 0 2px 4px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)",
                          position: "relative",
                          marginTop: "4px",
                        }}
                      >
                        <div
                          style={{
                            width: `${descriptionToxicityScore * 100}%`,
                            height: "100%",
                            backgroundImage: getGradientColor(
                              descriptionToxicityScore
                            ),
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
                              background:
                                "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                              animation: "shine 2s infinite",
                            }}
                          />
                        </div>
                      </div>
                      {descriptionToxicityScore > 0.5 && (
                        <p
                          style={{
                            color: "#ff0000",
                            fontSize: "12px",
                            marginTop: "4px",
                          }}
                        >
                          Toxicity too high! Please revise your description
                          (must be below 50%).{" "}
                          {toxicWords.length > 0 && (
                            <span>
                              Problematic words: {toxicWords.join(", ")}
                            </span>
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
                        style={{ borderRadius: "50px" }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label
                      htmlFor="anonymous"
                      className="font-semibold text-lg"
                    >
                      Post your topic anonymously :
                    </label>
                    <select
                      id="anonymous"
                      name="anonymous"
                      value={anonymous}
                      onChange={(e) => setAnonymous(e.target.value)}
                      className="form-control"
                      style={{ borderRadius: "50px" }}
                    >
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <select
                      id="tag"
                      value={tags}
                      onChange={(e) => {
                        const newTag = e.target.value;
                        setTags(newTag);
                        validateForm("tags", newTag);
                      }}
                      className="form-control"
                      style={{ borderRadius: "50px" }}
                    >
                      <option value="">Select a tag</option>
                      {tagOptions.map((tagOption) => (
                        <option key={tagOption} value={tagOption}>
                          {tagOption}
                        </option>
                      ))}
                    </select>
                    {tagsError && (
                      <p
                        style={{
                          color: "#ff0000",
                          fontSize: "12px",
                          marginTop: "4px",
                        }}
                      >
                        {tagsError}
                      </p>
                    )}
                  </div>

                  <div className="auth-group text-center">
                    <button
                      type="submit"
                      className="theme-btn w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={containsToxicContent || isToxic}
                      style={{ borderRadius: "50px", fontSize: "16px" }}
                    >
                      Add topic
                    </button>
                  </div>
                </form>
                {showChatbotModal && (
                  <div
                    style={{
                      position: "fixed",
                      top: 80,
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
                        borderRadius: "12px",
                        width: "600px",
                        maxWidth: "100%",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                        maxHeight: "80vh",
                      }}
                    >
                      <h3
                        style={{
                          marginBottom: "20px",
                          textAlign: "center",
                          color: "#333",
                          fontSize: "24px",
                          fontWeight: "bold",
                        }}
                      >
                        Chatbot Powered by Gemini 🤖
                      </h3>
                      <div
                        style={{
                          flex: 1,
                          maxHeight: "60vh",
                          overflowY: "auto",
                          marginBottom: "20px",
                          padding: "15px",
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          backgroundColor: "#f9f9f9",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {chatMessages.length > 0 ? (
                          chatMessages.map((msg, index) => (
                            <div
                              key={index}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems:
                                  msg.sender === "user"
                                    ? "flex-end"
                                    : "flex-start",
                                animation: "fadeIn 0.3s ease-in-out",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  maxWidth: "70%",
                                }}
                              >
                                {msg.sender === "bot" && (
                                  <span
                                    style={{
                                      fontSize: "20px",
                                      color: "#28a745",
                                    }}
                                  ></span>
                                )}
                                <div
                                  style={{
                                    padding: "10px 15px",
                                    borderRadius: "15px",
                                    backgroundColor:
                                      msg.sender === "user"
                                        ? "#007bff"
                                        : "#ffffff",
                                    color:
                                      msg.sender === "user" ? "white" : "#333",
                                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                                    wordBreak: "break-word",
                                    border:
                                      msg.sender === "bot"
                                        ? "1px solid #e0e0e0"
                                        : "none",
                                  }}
                                >
                                  <strong>
                                    {msg.sender === "user" ? "You" : "Bot"}:
                                  </strong>{" "}
                                  {cleanText(msg.text)}
                                </div>
                                {msg.sender === "user" && (
                                  <span
                                    style={{
                                      fontSize: "20px",
                                      color: "#007bff",
                                    }}
                                  >
                                    🧑
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#999",
                                  marginTop: "5px",
                                }}
                              >
                                {new Date().toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p
                            style={{
                              textAlign: "center",
                              color: "#666",
                              fontStyle: "italic",
                            }}
                          >
                            Start a conversation with the chatbot! 💬
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <input
                          type="text"
                          value={userMessage}
                          onChange={(e) => setUserMessage(e.target.value)}
                          placeholder="Type your message..."
                          style={{
                            flex: 1,
                            padding: "12px",
                            borderRadius: "50px",
                            border: "1px solid #ddd",
                            outline: "none",
                            fontSize: "14px",
                            transition: "border-color 0.3s ease",
                          }}
                          onFocus={(e) =>
                            (e.target.style.borderColor = "#007bff")
                          }
                          onBlur={(e) => (e.target.style.borderColor = "#ddd")}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && userMessage.trim()) {
                              setChatMessages((prev) => [
                                ...prev,
                                { sender: "user", text: userMessage },
                              ]);
                              interactWithGemini(userMessage).then((reply) => {
                                setChatMessages((prev) => [
                                  ...prev,
                                  { sender: "bot", text: cleanText(reply) },
                                ]);
                              });
                              setUserMessage("");
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (userMessage.trim()) {
                              setChatMessages((prev) => [
                                ...prev,
                                { sender: "user", text: userMessage },
                              ]);
                              interactWithGemini(userMessage).then((reply) => {
                                setChatMessages((prev) => [
                                  ...prev,
                                  { sender: "bot", text: cleanText(reply) },
                                ]);
                              });
                              setUserMessage("");
                            }
                          }}
                          style={{
                            backgroundColor: "#007bff",
                            color: "white",
                            padding: "12px 20px",
                            borderRadius: "50px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "14px",
                            transition:
                              "background-color 0.3s ease, transform 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#0056b3";
                            e.currentTarget.style.transform = "scale(1.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#007bff";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                        >
                          Send
                        </button>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          marginTop: "20px",
                          gap: "10px",
                        }}
                      >
                        <button
                          onClick={() => {
                            setShowChatbotModal(false);
                            setUserMessage("");
                          }}
                          style={{
                            backgroundColor: "#f44336",
                            color: "white",
                            padding: "10px 20px",
                            borderRadius: "50px",
                            border: "none",
                            cursor: "pointer",
                            transition: "background-color 0.3s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#d32f2f")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f44336")
                          }
                        >
                          Close
                        </button>
                        <button
                          onClick={() => {
                            setChatMessages([]);
                            localStorage.removeItem("chatMessages");
                          }}
                          style={{
                            backgroundColor: "#ff9800",
                            color: "white",
                            padding: "10px 20px",
                            borderRadius: "50px",
                            border: "none",
                            cursor: "pointer",
                            transition: "background-color 0.3s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#f57c00")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "#ff9800")
                          }
                        >
                          Clear Chat
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
