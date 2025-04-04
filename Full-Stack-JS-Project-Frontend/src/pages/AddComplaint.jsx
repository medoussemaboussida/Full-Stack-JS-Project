import React, { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode';
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";
import debounce from 'lodash/debounce';
import { Filter } from 'bad-words';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

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
      // Nettoyer les balises HTML pour la validation
      const cleanDescription = value.replace(/<[^>]+>/g, '').trim();
      if (!cleanDescription) {
        error = "Description is required.";
        isDescriptionValid = false;
      } else if (cleanDescription.length < 10) {
        error = "Description must be at least 10 characters long.";
        isDescriptionValid = false;
      } else if (cleanDescription.length > 1000) {
        error = "Description cannot exceed 1000 characters.";
        isDescriptionValid = false;
      } else if (!subjectRegex.test(cleanDescription)) {
        error = "Description can only contain letters, numbers, spaces, and some characters (.,!?').";
        isDescriptionValid = false;
      }
      setDescriptionError(error);
    }

    // Vérifier la validité globale du formulaire
    if (field === "all") {
      isSubjectValid = !subjectError && subject && subject.length >= 5 && subject.length <= 100 && subjectRegex.test(subject);
      const cleanDescription = description.replace(/<[^>]+>/g, '').trim();
      isDescriptionValid = !descriptionError && cleanDescription && cleanDescription.length >= 10 && cleanDescription.length <= 1000 && subjectRegex.test(cleanDescription);
    } else {
      // Si on valide un champ spécifique, vérifier l'autre champ
      isSubjectValid = field === "subject" ? isSubjectValid : !subjectError && subject && subject.length >= 5 && subject.length <= 100 && subjectRegex.test(subject);
      const cleanDescription = description.replace(/<[^>]+>/g, '').trim();
      isDescriptionValid = field === "description" ? isDescriptionValid : !descriptionError && cleanDescription && cleanDescription.length >= 10 && cleanDescription.length <= 1000 && subjectRegex.test(cleanDescription);
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
    const cleanDescription = description.replace(/<[^>]+>/g, '').trim();
    const subjectHasBadWords = badWordsFilter.isProfane(subject);
    const descriptionHasBadWords = badWordsFilter.isProfane(cleanDescription);

    if (subjectHasBadWords || descriptionHasBadWords) {
      const foundBadWords = [
        ...subject.split(/\s+/).filter(word => badWordsFilter.isProfane(word)),
        ...cleanDescription.split(/\s+/).filter(word => badWordsFilter.isProfane(word))
      ];
      toast.error(`Inappropriate content detected: ${foundBadWords.join(", ")}. Cannot submit.`, {
        position: "top-right",
        autoClose: 5000,
      });
      return;
    }

    const reclamationData = {
      subject,
      description, // Envoie le contenu HTML généré par CKEditor
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
                  <h2 className="text-2xl font-bold mb-4">Add a claim</h2>
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
                    <div className="ck-editor-container">
                      <CKEditor
                        editor={ClassicEditor}
                        data={description}
                        onChange={(event, editor) => {
                          const newDescription = editor.getData();
                          setDescription(newDescription);
                          validateForm("description", newDescription);
                          const cleanDescription = newDescription.replace(/<[^>]+>/g, '').trim();
                          checkBadWords(cleanDescription, "description");
                        }}
                        config={{
                          toolbar: [
                            'heading', '|',
                            'bold', 'italic', 'link', 'bulletedList', 'numberedList', '|',
                            'undo', 'redo'
                          ],
                          placeholder: "Enter your description here..."
                        }}
                      />
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
          background-color: rgb(95, 116, 143); /* Couleur grisée pour le bouton désactivé */
          cursor: not-allowed; /* Curseur indiquant que le bouton est désactivé */
          opacity: 0.6; /* Réduire l'opacité pour un effet visuel désactivé */
        }
        .ck-editor-container {
          width: 100%;
        }
        .ck-editor__editable {
          min-height: 150px; /* Hauteur minimale pour l'éditeur */
          padding: 10px 15px; /* Ajuster le padding pour un meilleur positionnement du texte */
          border: 1px solid #ccc; /* Ajouter une bordure pour harmoniser avec le reste du formulaire */
          border-radius: 4px; /* Coins arrondis */
          line-height: 1.5; /* Ajuster la hauteur de ligne pour éviter que le texte ne monte */
        }
        .ck-editor__editable p,
        .ck-editor__editable li {
          margin: 0 0 10px 0; /* Espacement entre les paragraphes et les éléments de liste */
        }
        .ck-editor__editable ul,
        .ck-editor__editable ol {
          padding-left: 20px; /* Indentation pour les listes */
          margin: 0 0 10px 0; /* Espacement pour les listes */
        }
        .ck-editor__editable ul li {
          list-style-type: disc; /* Assurer que les puces s'affichent */
        }
        .ck-editor__editable ol li {
          list-style-type: decimal; /* Assurer que les numéros s'affichent */
        }
        .ck-editor__editable i {
          font-style: italic; /* Assurer que le texte en italique est bien rendu */
        }
        .ck-editor__top {
          border-bottom: 1px solid #ccc; /* Séparer la barre d'outils du contenu */
        }
        .form-group {
          margin-bottom: 20px; /* Espacement entre les champs */
        }
        .form-control {
          padding-left: 40px; /* Espace pour l'icône dans le champ Subject */
          height: 40px; /* Hauteur cohérente avec le reste du formulaire */
          border: 1px solid #ccc; /* Bordure cohérente */
          border-radius: 4px; /* Coins arrondis */
        }
        .form-icon i {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 18px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default AddReclamation;