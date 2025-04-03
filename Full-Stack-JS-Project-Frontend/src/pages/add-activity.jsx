import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

function AddActivity() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    image: null,
    newCategory: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const navigate = useNavigate();

  const getToken = () => {
    return localStorage.getItem("jwt-token");
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const token = getToken();
      if (!token) {
        toast.error("Vous devez être connecté pour charger les catégories");
        return;
      }
      try {
        const response = await fetch("http://localhost:5000/users/categories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setCategories(data);
        } else {
          toast.error("Erreur lors du chargement des catégories");
        }
      } catch (error) {
        toast.error("Erreur réseau lors du chargement des catégories");
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const generateDescription = async () => {
    // ... (code existant inchangé)
  };

  const generateTitle = async () => {
    // ... (code existant inchangé)
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image") {
      const file = files[0];
      setFormData((prev) => ({ ...prev, image: file }));
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        setPreviewImage(imageUrl);
      } else {
        setPreviewImage(null);
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
        return data._id; // Retourne l'ID de la nouvelle catégorie créée
      } else {
        throw new Error(data.message || "Erreur lors de la création de la catégorie");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      toast.error("Vous devez être connecté pour ajouter une activité");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Veuillez remplir le titre de l'activité");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Veuillez remplir la description de l'activité");
      return;
    }
    if (!formData.category) {
      toast.error("Veuillez sélectionner ou ajouter une catégorie");
      return;
    }
    if (formData.category === "new" && !formData.newCategory.trim()) {
      toast.error("Veuillez entrer un nom pour la nouvelle catégorie");
      return;
    }

    setIsSubmitting(true);

    const decodedToken = jwtDecode(token);
    let categoryId = formData.category;

    // Si nouvelle catégorie, on la crée d'abord
    if (formData.category === "new") {
      try {
        categoryId = await createNewCategory(token, decodedToken.id);
        // Met à jour la liste des catégories localement
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
    data.append("category", categoryId); // Utilise l'ID de la catégorie (existante ou nouvellement créée)
    if (formData.image) {
      data.append("image", formData.image);
    }

    try {
      const response = await fetch(
        `http://localhost:5000/users/psychiatrist/${decodedToken.id}/add-activity`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: data,
        }
      );

      const result = await response.json();
      if (response.ok) {
        toast.success("Activité ajoutée avec succès !");
        setFormData({ title: "", description: "", category: "", image: null, newCategory: "" });
        setPreviewImage(null);
        setShowNewCategoryInput(false);
        setTimeout(() => navigate("/Activities"), 2000);
      } else {
        toast.error(result.message || "Erreur lors de l'ajout de l'activité");
      }
    } catch (error) {
      toast.error("Erreur réseau lors de l'ajout de l'activité");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAdd = () => {
    navigate("/Activities");
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Add an Activity</h2>
          <ul className="breadcrumb-menu">
            <li><a href="/Home">Home</a></li>
            <li><a href="/Activities">Activities</a></li>
            <li className="active">Add an Activity</li>
          </ul>
        </div>
      </div>

      <div className="py-120">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="become-volunteer-img">
                <img src={previewImage || "assets/img/activity/03.jpg"} alt="Preview" />
              </div>
            </div>
            <div className="col-lg-6">
              <div className="become-volunteer-form">
                <h2>Add a New Activity</h2>
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="form-group">
                        <input
                          type="text"
                          className="form-control"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="Activity Title"
                        />
                        <button
                          type="button"
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
                        <textarea
                          className="form-control"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          placeholder="Activity Description"
                          rows="3"
                        ></textarea>
                        <button
                          type="button"
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
                          <input
                            type="text"
                            className="form-control"
                            name="newCategory"
                            value={formData.newCategory}
                            onChange={handleChange}
                            placeholder="Nom de la nouvelle catégorie"
                          />
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
                        />
                      </div>
                    </div>

                    <div className="col-md-12">
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        <button
                          type="submit"
                          className="theme-btn mt-2"
                          disabled={isSubmitting || isGenerating}
                        >
                          {isSubmitting ? "Submitting..." : "Add Activity"}{" "}
                          <i className="fas fa-circle-arrow-right"></i>
                        </button>
                        <button
                          type="button"
                          className="theme-btn mt-2"
                          onClick={handleCancelAdd}
                          disabled={isSubmitting || isGenerating}
                          style={{ backgroundColor: "#f44336" }}
                        >
                          Cancel Add <i className="fas fa-times"></i>
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

export default AddActivity;