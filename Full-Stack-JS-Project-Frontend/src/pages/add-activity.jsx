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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [categories, setCategories] = useState([]); // Dynamic categories from backend
  const navigate = useNavigate();

  // Récupérer le token depuis localStorage
  const getToken = () => {
    return localStorage.getItem("jwt-token");
  };

  // Fetch categories from backend
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
          // Assuming the response is an array of { _id, name }
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

  // Fonction pour générer une description à partir du titre
  const generateDescription = async () => {
    if (!formData.title.trim()) {
      toast.error("Veuillez d'abord entrer un titre");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Vous devez être connecté pour générer une description");
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

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          description: data.description,
        }));
      } else {
        toast.error(data.message || "Erreur lors de la génération");
      }
    } catch (error) {
      toast.error("Erreur lors de la génération de la description");
      setFormData((prev) => ({
        ...prev,
        description: `Description automatique de ${formData.title}`,
      }));
    } finally {
      setIsGenerating(false);
    }
  };

  // Fonction pour générer un titre à partir de la description
  const generateTitle = async () => {
    if (!formData.description.trim()) {
      toast.error("Veuillez d'abord entrer une description");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Vous devez être connecté pour générer un titre");
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

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          title: data.title,
        }));
      } else {
        toast.error(data.message || "Erreur lors de la génération");
      }
    } catch (error) {
      toast.error("Erreur lors de la génération du titre");
      setFormData((prev) => ({
        ...prev,
        title: `Titre automatique`,
      }));
    } finally {
      setIsGenerating(false);
    }
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      toast.error("Vous devez être connecté pour ajouter une activité");
      return;
    }

    // Validation des champs
    if (!formData.title.trim()) {
      toast.error("Veuillez remplir le titre de l'activité");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Veuillez remplir la description de l'activité");
      return;
    }
    if (!formData.category) {
      toast.error("Veuillez sélectionner une catégorie");
      return;
    }

    setIsSubmitting(true);

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("category", formData.category); // Now sending category ID
    if (formData.image) {
      data.append("image", formData.image);
    }

    try {
      const decodedToken = jwtDecode(token);
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
        setFormData({ title: "", description: "", category: "", image: null });
        setPreviewImage(null);
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
                        </select>
                      </div>
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