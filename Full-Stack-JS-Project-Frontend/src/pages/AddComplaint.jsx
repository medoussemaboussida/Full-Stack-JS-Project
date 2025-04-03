import React, { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode';
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import debounce from 'lodash/debounce';
import { Filter } from 'bad-words';

const AddReclamation = () => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [subjectError, setSubjectError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [hasBadWords, setHasBadWords] = useState(false);

  const badWordsFilter = new Filter();

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

  const checkBadWords = debounce((text, field) => {
    const words = text.split(/\s+/);
    const foundBadWords = words.filter(word => badWordsFilter.isProfane(word));
    if (foundBadWords.length > 0) {
      toast.error(`Inappropriate content detected in ${field}: ${foundBadWords.join(", ")}. Please revise your text.`, {
        position: "top-right",
        autoClose: 5000,
      });
    }

    // Vérifier les deux champs pour mettre à jour hasBadWords
    const subjectHasBadWords = badWordsFilter.isProfane(subject);
    const descriptionHasBadWords = badWordsFilter.isProfane(description);
    setHasBadWords(subjectHasBadWords || descriptionHasBadWords);
  }, 500);

  const validateForm = (field, value) => {
    const subjectRegex = /^[A-Za-z0-9\s.,!?']+$/;
    let error = "";
    let isSubjectValid = true;
    let isDescriptionValid = true;

    if (field === "subject" || field === "all") {
      if (!value) {
        error = "Subject is required.";
        isSubjectValid = false;
      } else if (value.length < 5) {
        error = "Subject must be at least 5 characters long.";
        isSubjectValid = false;
      } else if (value.length > 100) {
        error = "Subject cannot exceed 100 characters.";
        isSubjectValid = false;
      } else if (!subjectRegex.test(value)) {
        error = "Subject can only contain letters, numbers, spaces, and some characters (.,!?).";
        isSubjectValid = false;
      }
      setSubjectError(error);
    }

    if (field === "description" || field === "all") {
      if (!value) {
        error = "Description is required.";
        isDescriptionValid = false;
      } else if (value.length < 10) {
        error = "Description must be at least 10 characters long.";
        isDescriptionValid = false;
      } else if (value.length > 1000) {
        error = "Description cannot exceed 1000 characters.";
        isDescriptionValid = false;
      } else if (!subjectRegex.test(value)) {
        error = "Description can only contain letters, numbers, spaces, and some characters (.,!?').";
        isDescriptionValid = false;
      }
      setDescriptionError(error);
    }

    // Vérifier la validité globale du formulaire
    if (field === "all") {
      isSubjectValid = !subjectError && subject && subject.length >= 5 && subject.length <= 100 && subjectRegex.test(subject);
      isDescriptionValid = !descriptionError && description && description.length >= 10 && description.length <= 1000 && subjectRegex.test(description);
    } else {
      // Si on valide un champ spécifique, vérifier l'autre champ
      isSubjectValid = field === "subject" ? isSubjectValid : !subjectError && subject && subject.length >= 5 && subject.length <= 100 && subjectRegex.test(subject);
      isDescriptionValid = field === "description" ? isDescriptionValid : !descriptionError && description && description.length >= 10 && description.length <= 1000 && subjectRegex.test(description);
    }

    setIsFormValid(isSubjectValid && isDescriptionValid);
    return isSubjectValid && isDescriptionValid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!userId || !token) {
      toast.error("You must be logged in to add a reclamation.");
      return;
    }

    const isSubjectValid = validateForm("subject", subject);
    const isDescriptionValid = validateForm("description", description);

    if (!isSubjectValid || !isDescriptionValid) {
      return;
    }

    // Vérification des bad words avant soumission
    const subjectHasBadWords = badWordsFilter.isProfane(subject);
    const descriptionHasBadWords = badWordsFilter.isProfane(description);

    if (subjectHasBadWords || descriptionHasBadWords) {
      const foundBadWords = [
        ...subject.split(/\s+/).filter(word => badWordsFilter.isProfane(word)),
        ...description.split(/\s+/).filter(word => badWordsFilter.isProfane(word))
      ];
      toast.error(`Inappropriate content detected: ${foundBadWords.join(", ")}. Cannot submit.`, {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    const reclamationData = {
      subject,
      description,
    };

    try {
      const response = await fetch(`http://localhost:5000/complaint/addComplaint/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reclamationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors ? errorData.errors.join(", ") : "Error adding reclamation.");
      }

      const data = await response.json();
      console.log("Réclamation ajoutée avec succès:", data);
      setSubject("");
      setDescription("");
      setSubjectError("");
      setDescriptionError("");
      setIsFormValid(false);
      setHasBadWords(false);
      toast.success('Your reclamation has been successfully added!');
    } catch (error) {
      console.error("Erreur:", error);
      toast.error(error.message || "Error adding the reclamation.");
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
        <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
          <div className="container">
            <h2 className="breadcrumb-title text-white">Add a claim</h2>
            <ul className="breadcrumb-menu">
              <li><a href="/Home">Home</a></li>
              <li><a href="/complaint">complaint</a></li>
              <li className="active">Add new complaint</li>
            </ul>
          </div>
        </div>

        <div className="auth-area py-120">
          <div className="container">
            <div className="col-md-5 mx-auto">
              <div className="auth-form">
                <div className="auth-header text-center">
                  <h2 className="text-2xl font-bold mb-4">Add Reclamation</h2>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <div className="form-icon">
                      <i className="far fa-pencil-alt"></i>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Subject"
                        value={subject}
                        onChange={(e) => {
                          const newSubject = e.target.value;
                          setSubject(newSubject);
                          validateForm("subject", newSubject);
                          checkBadWords(newSubject, "subject");
                        }}
                        required
                      />
                    </div>
                    {subjectError && (
                      <p className="text-red-500 text-xs mt-1">{subjectError}</p>
                    )}
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
                          validateForm("description", newDescription);
                          checkBadWords(newDescription, "description");
                        }}
                        required
                      ></textarea>
                    </div>
                    {descriptionError && (
                      <p className="text-red-500 text-xs mt-1">{descriptionError}</p>
                    )}
                  </div>

                  <div className="auth-group text-center">
                    <button
                      type="submit"
                      className="theme-btn w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      disabled={!isFormValid || hasBadWords}
                    >
                      Add a claim
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .theme-btn:disabled {
          background-color:rgb(95, 116, 143); /* Couleur grisée pour le bouton désactivé */
          cursor: not-allowed; /* Curseur indiquant que le bouton est désactivé */
          opacity: 0.6; /* Réduire l'opacité pour un effet visuel désactivé */
        }
      `}</style>
    </div>
  );
};

export default AddReclamation;