import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import EmojiPicker from 'emoji-picker-react';

function EditActivity() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    imageUrl: null,
    newCategory: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [categories, setCategories] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [showTitleEmojiPicker, setShowTitleEmojiPicker] = useState(false);
  const [showDescEmojiPicker, setShowDescEmojiPicker] = useState(false);
  const [showCategoryEmojiPicker, setShowCategoryEmojiPicker] = useState(false);
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const categoryInputRef = useRef(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const getToken = () => localStorage.getItem("jwt-token");

  useEffect(() => {
    const fetchCategories = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch("http://localhost:5000/users/categories", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setCategories(data);
        } else {
          toast.error("Erreur lors du chargement des catégories");
        }
      } catch (error) {
        toast.error("Erreur réseau lors du chargement des catégories");
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const token = getToken();
        if (!token) {
          toast.error("Vous devez être connecté pour modifier une activité.");
          return;
        }

        const response = await fetch(`http://localhost:5000/users/activity/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();
        if (response.ok) {
          console.log("Fetched activity data:", result);
          const imageUrl = result.imageUrl
            ? result.imageUrl.startsWith("http")
              ? result.imageUrl
              : `http://localhost:5000${result.imageUrl}`
            : null;
          setFormData({
            title: result.title || "",
            description: result.description || "",
            category: result.category?._id || "",
            imageUrl: result.imageUrl || null,
            newCategory: "",
          });
          setPreviewImage(imageUrl);
        } else {
          toast.error(result.message || "Erreur lors de la récupération des détails de l'activité.");
        }
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Erreur réseau lors de la récupération des détails de l'activité.");
      }
    };

    fetchActivity();
  }, [id]);

  const generateDescription = async () => {
    const token = getToken();
    if (!token) {
      toast.error("Vous devez être connecté pour générer une description");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Veuillez d'abord entrer un titre");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("http://localhost:5000/users/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: formData.title }),
      });

      const result = await response.json();
      if (response.ok) {
        setFormData((prev) => ({
          ...prev,
          description: result.description.description || result.description,
        }));
        toast.success("Description générée avec succès !");
      } else {
        toast.error(result.message || "Erreur lors de la génération de la description");
      }
    } catch (error) {
      toast.error("Erreur réseau lors de la génération de la description");
      console.error("Error generating description:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTitle = async () => {
    const token = getToken();
    if (!token) {
      toast.error("Vous devez être connecté pour générer un titre");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Veuillez d'abord entrer une description");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("http://localhost:5000/users/generate-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description: formData.description }),
      });

      const result = await response.json();
      if (response.ok) {
        const generatedTitle = result.title.title || result.title;
        setFormData((prev) => ({
          ...prev,
          title: generatedTitle,
        }));
        toast.success("Titre généré avec succès !");
      } else {
        toast.error(result.message || "Erreur lors de la génération du titre");
      }
    } catch (error) {
      toast.error("Erreur réseau lors de la génération du titre");
      console.error("Error generating title:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      const file = files[0];
      setFormData((prev) => ({ ...prev, imageUrl: file || prev.imageUrl }));
      if (file) {
        setPreviewImage(URL.createObjectURL(file));
      } else {
        setPreviewImage(
          formData.imageUrl
            ? formData.imageUrl.startsWith("http")
              ? formData.imageUrl
              : `http://localhost:5000${formData.imageUrl}`
            : null
        );
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (name === "category" && value === "new") {
        setShowNewCategoryInput(true);
      } else if (name === "category" && value !== "new") {
        setShowNewCategoryInput(false);
      }
    }
  };

  // Nouvelle fonction pour supprimer l'image actuelle
  const handleRemoveImage = async () => {
    try {
      // Charger l'image par défaut depuis les assets
      const response = await fetch("/assets/img/activity/03.jpg");
      if (!response.ok) throw new Error("Erreur lors du chargement de l'image par défaut");

      const blob = await response.blob();
      // Créer un objet File à partir du Blob
      const defaultImageFile = new File([blob], "default-activity-image.jpg", { type: "image/jpeg" });

      // Mettre à jour formData avec le fichier par défaut
      setFormData((prev) => ({ ...prev, imageUrl: defaultImageFile }));
      // Mettre à jour l'aperçu
      setPreviewImage("/assets/img/activity/03.jpg");
      toast.success("Image supprimée, revenue à l'image par défaut.");
    } catch (error) {
      console.error("Erreur lors de la récupération de l'image par défaut:", error);
      toast.error("Erreur lors du chargement de l'image par défaut");
      // Fallback : utiliser null si ça échoue
      setFormData((prev) => ({ ...prev, imageUrl: null }));
      setPreviewImage("/assets/img/activity/03.jpg");
    }
  };

  const createNewCategory = async (token, userId) => {
    try {
      const response = await fetch(`http://localhost:5000/users/categories/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: formData.newCategory }),
      });

      const data = await response.json();
      if (response.ok) {
        return data._id;
      } else {
        throw new Error(data.message || "Erreur lors de la création de la catégorie");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const token = getToken();
    if (!token) {
      toast.error("Vous devez être connecté pour modifier une activité.");
      setIsSubmitting(false);
      return;
    }

    const decoded = jwtDecode(token);
    const userId = decoded.id;

    let categoryId = formData.category;

    if (formData.category === "new") {
      if (!formData.newCategory.trim()) {
        toast.error("Veuillez entrer un nom pour la nouvelle catégorie.");
        setIsSubmitting(false);
        return;
      }
      try {
        categoryId = await createNewCategory(token, userId);
        setCategories((prev) => [...prev, { _id: categoryId, name: formData.newCategory }]);
      } catch (error) {
        toast.error(error.message || "Erreur lors de la création de la catégorie");
        setIsSubmitting(false);
        return;
      }
    }

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("category", categoryId);

    // Si imageUrl est un fichier (soit une nouvelle image, soit l'image par défaut)
    if (formData.imageUrl instanceof File) {
      data.append("image", formData.imageUrl);
    } else if (formData.imageUrl === null) {
      // Si aucune image n'est définie, indiquer au backend de supprimer l'image
      data.append("removeImage", true);
    }

    try {
      const response = await fetch(
        `http://localhost:5000/users/psychiatrist/${userId}/update-activity/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: data,
        }
      );

      const result = await response.json();
      if (response.ok) {
        toast.success("Activité mise à jour avec succès !");
        setTimeout(() => navigate("/Activities"), 2000);
      } else {
        toast.error(result.message || "Erreur lors de la mise à jour de l'activité.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Erreur réseau lors de la mise à jour de l'activité.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/Activities");
  };

  const handleTitleEmojiClick = (emojiObject) => {
    setFormData((prev) => ({
      ...prev,
      title: prev.title + emojiObject.emoji,
    }));
    setShowTitleEmojiPicker(false);
  };

  const handleDescEmojiClick = (emojiObject) => {
    setFormData((prev) => ({
      ...prev,
      description: prev.description + emojiObject.emoji,
    }));
    setShowDescEmojiPicker(false);
  };

  const handleCategoryEmojiClick = (emojiObject) => {
    setFormData((prev) => ({
      ...prev,
      newCategory: prev.newCategory + emojiObject.emoji,
    }));
    setShowCategoryEmojiPicker(false);
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="site-breadcrumb" style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Edit Activity</h2>
          <ul className="breadcrumb-menu">
            <li><a href="/Home">Home</a></li>
            <li><a href="/Activities">Activities</a></li>
            <li className="active">Edit Activity</li>
          </ul>
        </div>
      </div>

      <div className="py-120">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
            <div className="become-volunteer-img" style={{ position: "relative" }}>
              {previewImage ? (
                <>
                  <img
                    src={previewImage}
                    alt="Activity Image"
                    style={{ maxWidth: "100%", height: "auto" }}
                    onError={(e) => {
                      e.target.src = "/assets/img/activity/03.jpg"; // Image par défaut en cas d'erreur
                      console.log("Preview image failed to load, switched to default.");
                    }}
                  />
                  {previewImage !== "/assets/img/activity/03.jpg" && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "rgba(255, 0, 0, 0.8)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "25px",
                        height: "25px",
                        cursor: "pointer",
                        fontSize: "16px",
                        lineHeight: "25px",
                        textAlign: "center",
                      }}
                      title="Supprimer l'image"
                    >
                      X
                    </button>
                  )}
                </>
              ) : (
                <img
                  src="/assets/img/activity/03.jpg"
                  alt="Default Activity Image"
                  style={{ maxWidth: "100%", height: "auto" }}
                  onError={() => console.log("Default image failed to load")}
                />
              )}
            </div>
            </div>
            <div className="col-lg-6">
              <div className="become-volunteer-form">
                <h2 style={{ fontSize: "32px", fontWeight: "700", marginBottom: "40px" }}>
                  Edit an <span style={{ color: "#ff5a5f" }}>Activity</span>
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="form-group">
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            className="form-control"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Activity Title"
                            required
                            style={{ borderRadius: "50px" }}
                            ref={titleInputRef}
                          />
                          <button
                            type="button"
                            onClick={() => setShowTitleEmojiPicker(!showTitleEmojiPicker)}
                            style={{
                              position: "absolute",
                              top: "10px",
                              right: "10px",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "20px",
                              zIndex: 1000,
                            }}
                          >
                            😊
                          </button>
                          {showTitleEmojiPicker && (
                            <div style={{ position: "absolute", top: "-350px", right: "0", zIndex: 1000 }}>
                              <EmojiPicker onEmojiClick={handleTitleEmojiClick} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button" style={{ borderRadius: "50px" }}
                          className="theme-btn mt-2"
                          onClick={generateDescription}
                          disabled={isGenerating || isSubmitting}
                        >
                          {isGenerating ? "Génération..." : "Générer Description"}
                        </button>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-group">
                        <div style={{ position: "relative" }}>
                          <textarea
                            className="form-control"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Activity Description"
                            required
                            rows="3"
                            ref={descriptionInputRef}
                          ></textarea>
                          <button
                            type="button"
                            onClick={() => setShowDescEmojiPicker(!showDescEmojiPicker)}
                            style={{
                              position: "absolute",
                              top: "10px",
                              right: "10px",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "20px",
                              zIndex: 1000,
                            }}
                          >
                            😊
                          </button>
                          {showDescEmojiPicker && (
                            <div style={{ position: "absolute", top: "-350px", right: "0", zIndex: 1000 }}>
                              <EmojiPicker onEmojiClick={handleDescEmojiClick} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button" style={{ borderRadius: "50px" }}
                          className="theme-btn mt-2"
                          onClick={generateTitle}
                          disabled={isGenerating || isSubmitting}
                        >
                          {isGenerating ? "Génération..." : "Générer Titre"}
                        </button>
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div className="form-group">
                        <select
                          className="form-control"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          required
                        >
                          <option value="">Select a Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                          ))}
                          <option value="new">Ajouter une nouvelle catégorie</option>
                        </select>
                      </div>
                      {showNewCategoryInput && (
                        <div className="form-group mt-2">
                          <div style={{ position: "relative" }}>
                            <input
                              type="text"
                              className="form-control"
                              name="newCategory"
                              value={formData.newCategory}
                              onChange={handleChange}
                              placeholder="Nom de la nouvelle catégorie"
                              required
                              style={{ borderRadius: "50px" }}
                              ref={categoryInputRef}
                            />
                            <button
                              type="button"
                              onClick={() => setShowCategoryEmojiPicker(!showCategoryEmojiPicker)}
                              style={{
                                position: "absolute",
                                top: "10px",
                                right: "10px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "20px",
                                zIndex: 1000,
                              }}
                            >
                              😊
                            </button>
                            {showCategoryEmojiPicker && (
                              <div style={{ position: "absolute", top: "-350px", right: "0", zIndex: 1000 }}>
                                <EmojiPicker onEmojiClick={handleCategoryEmojiClick} />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="col-md-12">
                      <div className="form-group">
                        <input
                          type="file"
                          name="image"
                          accept="image/*"
                          onChange={handleChange}
                          className="form-control"
                          style={{ borderRadius: "50px" }}
                        />
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        <button
                          type="submit" style={{ borderRadius: "50px" }}
                          className="theme-btn mt-2"
                          disabled={isSubmitting || isGenerating}
                        >
                          {isSubmitting ? "Updating..." : "Update Activity"}{" "}
                          <i className="fas fa-circle-arrow-right"></i>
                        </button>
                        <button
                          type="button"
                          className="theme-btn mt-2"
                          onClick={handleCancel}
                          disabled={isSubmitting || isGenerating}
                          style={{ backgroundColor: "#f44336" ,borderRadius: "50px" }}
                        >
                          Cancel Edit <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

export default EditActivity;