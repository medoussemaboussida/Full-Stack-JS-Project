import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";

function EditActivity() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    imageUrl: null,
    newCategory: "", // Nouveau champ pour la nouvelle catégorie
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false); // Contrôle l'affichage du champ nouvelle catégorie
  const navigate = useNavigate();
  const { id } = useParams();

  // Récupérer le token
  const getToken = () => localStorage.getItem("jwt-token");

  // Fetch des catégories
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
          setCategories(data); // [{ _id, name }]
        } else {
          toast.error("Erreur lors du chargement des catégories");
        }
      } catch (error) {
        toast.error("Erreur réseau lors du chargement des catégories");
      }
    };

    fetchCategories();
  }, []);

  // Fetch des détails de l'activité
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
            category: result.category?._id || "", // Récupère l'ID de la catégorie existante
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

  // Gestion des changements dans le formulaire
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

  // Création d'une nouvelle catégorie
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

  // Soumission du formulaire
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

    // Si une nouvelle catégorie est ajoutée
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
    data.append("category", categoryId); // Utilise l'ID de la catégorie (existante ou nouvelle)

    if (formData.imageUrl && formData.imageUrl instanceof File) {
      data.append("image", formData.imageUrl);
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

  // Annulation de la modification
  const handleCancel = () => {
    navigate("/Activities");
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="site-breadcrumb" style={{ background: "url(/assets/img/breadcrumb/01.jpg)" }}>
        <div className="container">
          <h2 className="breadcrumb-title">Edit Activity</h2>
          <ul className="breadcrumb-menu">
            <li>
              <a href="/Home">Home</a>
            </li>
            <li>
              <a href="/Activities">Activities</a>
            </li>
            <li className="active">Edit Activity</li>
          </ul>
        </div>
      </div>

      <div className="py-120">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="become-volunteer-img">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt="Activity Image"
                    style={{ maxWidth: "100%", height: "auto" }}
                    onError={(e) => {
                      e.target.src = "/assets/img/default-image.jpg";
                      console.log("Activity image failed to load, using default.");
                    }}
                  />
                ) : (
                  <div>
                    <p>No image available for this activity</p>
                  </div>
                )}
              </div>
            </div>
            <div className="col-lg-6">
              <div className="become-volunteer-form">
                <h2
                  style={{
                    fontSize: "32px",
                    fontWeight: "700",
                    marginBottom: "40px",
                  }}
                >
                  Edit an <span style={{ color: "#ff5a5f" }}>Activity</span>
                </h2>
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
                          required
                        />
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
                          required
                          rows="3"
                        ></textarea>
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
                          <input
                            type="text"
                            className="form-control"
                            name="newCategory"
                            value={formData.newCategory}
                            onChange={handleChange}
                            placeholder="Nom de la nouvelle catégorie"
                            required
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
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Updating..." : "Update Activity"}{" "}
                          <i className="fas fa-circle-arrow-right"></i>
                        </button>
                        <button
                          type="button"
                          className="theme-btn mt-2"
                          onClick={handleCancel}
                          disabled={isSubmitting}
                          style={{ backgroundColor: "#f44336" }}
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

      <footer className="footer-area">
        <div className="container">
          <div className="copyright text-center">
            <p>
              © {new Date().getFullYear()} <a href="#">Lovcare</a> - All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default EditActivity;