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
        toast.error("You must be logged in to load categories");
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
          toast.error("Error loading categories");
        }
      } catch (error) {
        toast.error("Network error while loading categories");
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const generateDescription = async () => {
    const token = getToken();
    if (!token) {
      toast.error("You must be logged in to generate a description");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a title first");
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
        toast.success("Description generated successfully !");
      } else {
        toast.error(result.message || "Error generating description");
      }
    } catch (error) {
      toast.error("Network error while generating description");
      console.error("Error generating description:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTitle = async () => {
    const token = getToken();
    if (!token) {
      toast.error("You must be logged in to generate a title");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Please enter a description first");
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
        setFormData((prev) => ({
          ...prev,
          title: result.title.title || result.title,
        }));
        toast.success("Title generated successfully!");
      } else {
        toast.error(result.message || "Error generating title");
      }
    } catch (error) {
      toast.error("Network error while generating the title");
      console.error("Error generating title:", error);
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
        return data._id;
      } else {
        throw new Error(data.message || "Error creating category");
      }
    } catch (error) {
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      toast.error("You must be logged in to add an activity");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please fill in the title of the activity");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Please fill out the activity description");
      return;
    }
    if (!formData.category) {
      toast.error("Please select or add a category");
      return;
    }
    if (formData.category === "new" && !formData.newCategory.trim()) {
      toast.error("Please enter a name for the new category");
      return;
    }

    setIsSubmitting(true);

    const decodedToken = jwtDecode(token);
    let categoryId = formData.category;

    if (formData.category === "new") {
      try {
        categoryId = await createNewCategory(token, decodedToken.id);
        setCategories((prev) => [...prev, { _id: categoryId, name: formData.newCategory }]);
      } catch (error) {
        toast.error(error.message || "Error creating category");
        setIsSubmitting(false);
        return;
      }
    }

    const data = new FormData();
    data.append("title", formData.title);
    data.append("description", formData.description);
    data.append("category", categoryId);
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
        toast.success("Activity added successfully !");
        setFormData({ title: "", description: "", category: "", image: null, newCategory: "" });
        setPreviewImage(null);
        setShowNewCategoryInput(false);
        setTimeout(() => navigate("/Activities"), 2000);
      } else {
        toast.error(result.message || "Error adding activity");
      }
    } catch (error) {
      toast.error("Network error while adding activity");
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
                          style={{ borderRadius: "50px" }}

                        />
                        <button
                          type="button" style={{ borderRadius: "50px" }}
                          className="theme-btn mt-2"
                          onClick={generateDescription}
                          disabled={isGenerating || isSubmitting}
                        >
                          {isGenerating ? "Generation..." : "Generate Description"}
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
                          type="button" style={{ borderRadius: "50px" }}
                          className="theme-btn mt-2"
                          onClick={generateTitle}
                          disabled={isGenerating || isSubmitting}
                        >
                          {isGenerating ? "Generation...": "Generate Title"}
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
                          style={{ borderRadius: "50px" }}
                        >
                          <option value="">Select a Category</option>
                          {categories.map((cat) => (
                            <option key={cat._id} value={cat._id}>
                              {cat.name}
                            </option>
                          ))}
                          <option value="new">Add a new category</option>
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
                          {isSubmitting ? "Submitting..." : "Add Activity"}{" "}
                          <i className="fas fa-circle-arrow-right"></i>
                        </button>
                        <button
                          type="button" 
                          className="theme-btn mt-2"
                          onClick={handleCancelAdd}
                          disabled={isSubmitting || isGenerating}
                          style={{ backgroundColor: "#f44336", borderRadius:"50px" }}
                        >
                          Cancel Add <i className="fas fa-times" ></i>
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